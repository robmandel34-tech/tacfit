import type { HealthMetric } from "@shared/schema";
import type { IStorage } from "./storage";

// Readiness scoring.
//
// We score a user's most recent day of health metrics against their own rolling
// baseline (mean + standard deviation of the prior days). Each contributing
// signal is converted to a 0..100 sub-score via a direction-adjusted z-score,
// then combined with fixed weights (renormalized over whatever signals are
// actually available for that user).
//
// HRV is the strongest readiness predictor and carries the largest weight. It is
// read from Apple Health via a patched build of the plugin
// (heartRateVariabilitySDNN, in milliseconds). On any day the value is missing,
// its weight is simply dropped from the renormalized pool.

export type ReadinessBucket =
  | "stand_down"
  | "limited_duty"
  | "field_ready"
  | "combat_ready"
  | "optimal_force";
export type ReadinessState = "ready" | "calibrating" | "insufficient";

export interface ReadinessResult {
  score: number | null;
  bucket: ReadinessBucket | null;
  state: ReadinessState;
  signalsUsed: number;
  metricDate: string | null;
}

// How many distinct days of history a user needs before a baseline is meaningful.
const MIN_HISTORY_DAYS = 14;
// Minimum number of contributing signals on the scored day to show a score.
// Two is enough when one of them is HRV (the strongest readiness predictor,
// highest weight). Many real devices only log HRV + SpO2 on a given day —
// resting HR, respiratory rate, and sleep require more wear time / sleep
// tracking — so requiring three would force a false "insufficient" even with
// months of rich history.
const MIN_SIGNALS = 2;

// Testing exception: these accounts bypass the historical-data requirement so
// they can verify the Readiness ring end-to-end with only a day or two of synced
// data. Configurable via the READINESS_TEST_EMAILS env var (comma-separated).
// This relaxes the 14-day baseline gate and lets signals fall back to absolute
// scoring when there isn't enough history yet — it does NOT fabricate data.
// NOTE: intentionally EMPTY so every account (including the owner) is scored
// like a normal user with real data. To re-enable preview/relaxed mode for an
// account, add its email here (e.g. "robmandel34@gmail.com") or set
// READINESS_TEST_EMAILS.
const DEFAULT_TEST_EMAILS: string[] = [];
function testAccountEmails(): Set<string> {
  const fromEnv = (process.env.READINESS_TEST_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_TEST_EMAILS.map((e) => e.toLowerCase()), ...fromEnv]);
}

// True when an email belongs to a designated test/owner account.
export function isReadinessTestAccount(email?: string | null): boolean {
  if (!email) return false;
  return testAccountEmails().has(email.toLowerCase());
}

// A realistic sample readiness result, used ONLY for designated test/owner
// accounts that have no real synced health data yet, so the Readiness ring can
// be previewed end-to-end. Real synced data always takes precedence once it
// exists — this is never used for normal accounts and never persisted.
export function sampleReadiness(): ReadinessResult {
  const today = new Date().toISOString().split("T")[0];
  return {
    score: 78,
    bucket: bucketFor(78),
    state: "ready",
    signalsUsed: 5,
    metricDate: today,
  };
}

// Options that loosen the scoring gates for testing accounts.
export interface ReadinessOptions {
  minHistoryDays?: number;
  minSignals?: number;
  // When true, directional signals with too little history fall back to an
  // absolute (norm-based) sub-score instead of being dropped.
  relaxBaseline?: boolean;
}

// Absolute, norm-based 0..100 sub-score used only as a baseline-free fallback for
// testing accounts. Values reflect broadly healthy adult ranges; these are
// intentionally rough since they only exist so the ring can render before a
// personal baseline is established.
function absoluteSubScore(key: WeightKey, value: number): number | null {
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  switch (key) {
    case "hrv":
      // Higher is better; ~20ms -> 0, ~80ms -> 100.
      return clamp(((value - 20) / 60) * 100);
    case "restingHeartRate":
      // Lower is better; 50bpm -> 100, 100bpm -> 0.
      return clamp(100 - (value - 50) * 2);
    case "respiratoryRate":
      // Lower is better; 12/min -> 100, 28/min -> 0.
      return clamp(100 - (value - 12) * 6.25);
    case "oxygenSaturation":
      // Higher is better; 90% -> 0, 100% -> 100.
      return clamp((value - 90) * 10);
    default:
      // Body temperature has no baseline-free reading; stay neutral.
      return null;
  }
}
// Look back at most this many days when building the baseline.
const BASELINE_WINDOW_DAYS = 30;
// Body temperature this far above baseline (in the stored unit) forces a Rest day.
const TEMP_FEVER_DELTA = 1.0;
// Sleep sub-score target (minutes) — 7.5h of total sleep is treated as ideal.
const SLEEP_TARGET_MIN = 7.5 * 60;

const WEIGHTS = {
  hrv: 0.30,
  sleep: 0.25,
  restingHeartRate: 0.20,
  oxygenSaturation: 0.10,
  respiratoryRate: 0.10,
  bodyTemperature: 0.05,
} as const;

type WeightKey = keyof typeof WEIGHTS;

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((a, b) => a + (b - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// Maps a z-score onto 0..100 where z=0 -> 50 and roughly ±2.5 sd spans the range.
function zToScore(z: number): number {
  return Math.max(0, Math.min(100, 50 + z * 20));
}

// Builds a 0..100 sleep sub-score from total / deep / REM minutes.
// Duration vs the 7.5h target dominates; deep and REM proportions refine it.
function sleepSubScore(total: number, deep: number | null, rem: number | null): number {
  const durationScore = Math.max(0, Math.min(100, (total / SLEEP_TARGET_MIN) * 100));
  let score = durationScore;
  const parts: number[] = [durationScore];
  if (deep != null && total > 0) {
    // ~15-20% deep sleep is healthy; scale 20% -> 100.
    parts.push(Math.max(0, Math.min(100, (deep / total / 0.2) * 100)));
  }
  if (rem != null && total > 0) {
    // ~20-25% REM is healthy; scale 25% -> 100.
    parts.push(Math.max(0, Math.min(100, (rem / total / 0.25) * 100)));
  }
  if (parts.length > 1) {
    // Weight duration at 60%, stage quality at 40% combined.
    const stageAvg = mean(parts.slice(1));
    score = durationScore * 0.6 + stageAvg * 0.4;
  }
  return score;
}

function bucketFor(score: number): ReadinessBucket {
  if (score >= 80) return "optimal_force";
  if (score >= 60) return "combat_ready";
  if (score >= 40) return "field_ready";
  if (score >= 20) return "limited_duty";
  return "stand_down";
}

// How many days back from the newest synced day we'll look for a scorable
// "today." The newest calendar day is frequently a PARTIAL day that hasn't
// picked up last night's overnight signals (HRV, sleep, respiratory rate) yet,
// which would force a false "insufficient." So we score the most recent day that
// actually has enough signals, as long as it's within this window. Kept modest
// so the score still reflects recent recovery, but wide enough to step over a
// partial newest day or a one-off gap in syncing.
const SCORE_RECENCY_DAYS = 5;

// Whole-day distance between two "YYYY-MM-DD" dates.
function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  return Math.round(Math.abs(da - db) / (24 * 60 * 60 * 1000));
}

// Builds the weighted signal contributions for a single day against its
// prior-day baseline. Pure; makes no state decision.
function buildContributions(
  today: HealthMetric,
  history: HealthMetric[],
  relaxBaseline: boolean,
): { key: WeightKey; subScore: number; weight: number }[] {
  // Direction: +1 means higher-is-better, -1 means lower-is-better,
  // 0 means deviation-from-baseline-is-worse (absolute).
  const directional: { key: WeightKey; value: number | null; dir: 1 | -1 | 0 }[] = [
    { key: "hrv", value: today.hrv, dir: 1 },
    { key: "restingHeartRate", value: today.restingHeartRate, dir: -1 },
    { key: "respiratoryRate", value: today.respiratoryRate, dir: -1 },
    { key: "oxygenSaturation", value: today.oxygenSaturation, dir: 1 },
    { key: "bodyTemperature", value: today.bodyTemperature, dir: 0 },
  ];

  const contributions: { key: WeightKey; subScore: number; weight: number }[] = [];

  for (const { key, value, dir } of directional) {
    if (value == null) continue;
    const series = history
      .map((m) => m[key as keyof HealthMetric] as number | null)
      .filter((v): v is number => v != null);
    const avg = series.length >= 2 ? mean(series) : 0;
    const sd = series.length >= 2 ? stddev(series, avg) : 0;
    if (series.length < 2 || sd === 0) {
      // Not enough history (or no variation) for a baseline z-score. For testing
      // accounts, fall back to an absolute norm-based sub-score so the signal
      // still counts; otherwise drop it as before.
      if (!relaxBaseline) continue;
      const abs = absoluteSubScore(key, value);
      if (abs == null) continue;
      contributions.push({ key, subScore: abs, weight: WEIGHTS[key] });
      continue;
    }
    let z = (value - avg) / sd;
    if (dir === -1) z = -z;
    else if (dir === 0) z = -Math.abs(z);
    contributions.push({ key, subScore: zToScore(z), weight: WEIGHTS[key] });
  }

  // Sleep sub-score (own 0..100 scale, not baseline-relative).
  if (today.sleepDurationMin != null && today.sleepDurationMin > 0) {
    contributions.push({
      key: "sleep",
      subScore: sleepSubScore(today.sleepDurationMin, today.deepSleepMin, today.remSleepMin),
      weight: WEIGHTS.sleep,
    });
  }

  return contributions;
}

// Pure scoring function. `metrics` may be in any order. We score the most recent
// day that has enough signals (within SCORE_RECENCY_DAYS of the newest synced
// day), using the days before it as the baseline.
export function computeReadiness(
  metrics: HealthMetric[],
  options: ReadinessOptions = {},
): ReadinessResult {
  const minHistoryDays = options.minHistoryDays ?? MIN_HISTORY_DAYS;
  const minSignals = options.minSignals ?? MIN_SIGNALS;
  const relaxBaseline = options.relaxBaseline ?? false;

  if (metrics.length === 0) {
    return { score: null, bucket: null, state: "insufficient", signalsUsed: 0, metricDate: null };
  }

  const sorted = [...metrics].sort((a, b) => a.metricDate.localeCompare(b.metricDate));
  const newestDate = sorted[sorted.length - 1].metricDate;

  // Not enough total history for a meaningful personal baseline yet.
  if (sorted.length < minHistoryDays) {
    return {
      score: null,
      bucket: null,
      state: "calibrating",
      signalsUsed: 0,
      metricDate: newestDate,
    };
  }

  // Walk newest -> older within the recency window; score the first day that has
  // enough signals. This avoids a false "insufficient" when the very latest day
  // is a partial day missing overnight metrics.
  let chosenIdx = -1;
  let contributions: { key: WeightKey; subScore: number; weight: number }[] = [];
  let latestSignalsUsed = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (daysBetween(sorted[i].metricDate, newestDate) > SCORE_RECENCY_DAYS) break;
    const history = sorted.slice(0, i).slice(-BASELINE_WINDOW_DAYS);
    const dayContribs = buildContributions(sorted[i], history, relaxBaseline);
    if (i === sorted.length - 1) latestSignalsUsed = dayContribs.length;
    // A day qualifies when it has at least minSignals contributions. At the
    // 2-signal floor we additionally require HRV (the strongest predictor, and
    // the highest-weighted signal) to be one of them, so a thin low-information
    // pair like resting HR + SpO2 can't produce a misleading score.
    const hasHrv = dayContribs.some((c) => c.key === "hrv");
    const qualifies =
      dayContribs.length >= minSignals && (dayContribs.length >= 3 || hasHrv);
    if (qualifies) {
      chosenIdx = i;
      contributions = dayContribs;
      break;
    }
  }

  // No recent day had enough signals to score.
  if (chosenIdx === -1) {
    return {
      score: null,
      bucket: null,
      state: "insufficient",
      signalsUsed: latestSignalsUsed,
      metricDate: newestDate,
    };
  }

  const today = sorted[chosenIdx];
  const history = sorted.slice(0, chosenIdx).slice(-BASELINE_WINDOW_DAYS);

  const totalWeight = contributions.reduce((a, c) => a + c.weight, 0);
  let final = contributions.reduce((a, c) => a + c.subScore * (c.weight / totalWeight), 0);

  // Fever override: a body temperature well above baseline forces a Rest day.
  if (today.bodyTemperature != null) {
    const tempSeries = history
      .map((m) => m.bodyTemperature)
      .filter((v): v is number => v != null);
    if (tempSeries.length >= 2) {
      const tempAvg = mean(tempSeries);
      if (today.bodyTemperature >= tempAvg + TEMP_FEVER_DELTA) {
        final = Math.min(final, 20);
      }
    }
  }

  const score = Math.round(Math.max(0, Math.min(100, final)));
  return {
    score,
    bucket: bucketFor(score),
    state: "ready",
    signalsUsed: contributions.length,
    metricDate: today.metricDate,
  };
}

// Recomputes and persists a user's readiness from their stored daily metrics.
export async function recomputeReadinessForUser(
  storage: IStorage,
  userId: number,
): Promise<ReadinessResult> {
  const metrics = await storage.getHealthMetrics(userId);

  // Testing exception: for designated test accounts, relax the historical-data
  // gates so the Readiness ring can be verified with only a day or two of synced
  // data (1 day of history is enough; signals fall back to absolute scoring).
  let options: ReadinessOptions = {};
  const user = await storage.getUser(userId);
  if (user?.email && testAccountEmails().has(user.email.toLowerCase())) {
    options = { minHistoryDays: 1, minSignals: 2, relaxBaseline: true };
  }

  const result = computeReadiness(metrics, options);
  await storage.upsertReadiness(userId, {
    score: result.score,
    bucket: result.bucket,
    state: result.state,
    signalsUsed: result.signalsUsed,
    metricDate: result.metricDate,
  });
  return result;
}

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

export type ReadinessBucket = "ready" | "moderate" | "fatigued" | "rest";
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
const MIN_SIGNALS = 3;
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
  if (score >= 75) return "ready";
  if (score >= 50) return "moderate";
  if (score >= 25) return "fatigued";
  return "rest";
}

// Pure scoring function. `metrics` may be in any order; the most recent
// metricDate is treated as "today" and the rest form the baseline.
export function computeReadiness(metrics: HealthMetric[]): ReadinessResult {
  if (metrics.length === 0) {
    return { score: null, bucket: null, state: "insufficient", signalsUsed: 0, metricDate: null };
  }

  const sorted = [...metrics].sort((a, b) => a.metricDate.localeCompare(b.metricDate));
  const today = sorted[sorted.length - 1];
  const history = sorted.slice(0, -1).slice(-BASELINE_WINDOW_DAYS);

  // Not enough total history for a meaningful personal baseline yet.
  if (sorted.length < MIN_HISTORY_DAYS) {
    return {
      score: null,
      bucket: null,
      state: "calibrating",
      signalsUsed: 0,
      metricDate: today.metricDate,
    };
  }

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
    if (series.length < 2) continue;
    const avg = mean(series);
    const sd = stddev(series, avg);
    if (sd === 0) continue; // no variation -> uninformative
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

  const signalsUsed = contributions.length;
  if (signalsUsed < MIN_SIGNALS) {
    return {
      score: null,
      bucket: null,
      state: "insufficient",
      signalsUsed,
      metricDate: today.metricDate,
    };
  }

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
    signalsUsed,
    metricDate: today.metricDate,
  };
}

// Recomputes and persists a user's readiness from their stored daily metrics.
export async function recomputeReadinessForUser(
  storage: IStorage,
  userId: number,
): Promise<ReadinessResult> {
  const metrics = await storage.getHealthMetrics(userId);
  const result = computeReadiness(metrics);
  await storage.upsertReadiness(userId, {
    score: result.score,
    bucket: result.bucket,
    state: result.state,
    signalsUsed: result.signalsUsed,
    metricDate: result.metricDate,
  });
  return result;
}

import { Capacitor } from "@capacitor/core";

// Normalized workout shape sent to the backend /api/apple-health/sync endpoint.
export interface NormalizedWorkout {
  healthKitWorkoutId: string;
  activityType: string; // HealthKit workout type name, e.g. "Running"
  startTime: string; // ISO
  endTime: string; // ISO
  durationSec: number;
  distanceMeters: number;
  energyKcal: number;
  avgHeartRate: number;
  routePolyline: string | null;
  raw: unknown;
}

// Reconcile a workout's reported active duration against its wall-clock elapsed
// time (endDate - startDate). HealthKit's `duration` is the *active* time and is
// normally the right value (it excludes auto-pauses), so we trust it — but the
// plugin sometimes returns a broken value (0, missing, or implausibly tiny, e.g.
// 2s for a 99-minute match). Only in that broken case do we fall back to the
// elapsed time. A reported value within 20% of elapsed is treated as legitimate
// so genuinely paused workouts are not inflated to wall-clock time.
export { reconcileWorkoutDurationSec } from "@shared/healthkit";
import {
  reconcileWorkoutDurationSec,
  HEALTHKIT_MINDFUL_SESSION_TYPE,
  MIN_MINDFUL_SESSION_MINUTES,
  mindfulSessionDurationSec,
} from "@shared/healthkit";

// HealthKit read scopes we request. These map to @perfood/capacitor-healthkit
// authorization option keys. The second group powers the Readiness score
// (resting HR, respiratory rate, blood oxygen, body temperature, sleep).
// "mindfulSession" (Mindful Minutes) is added by scripts/patch-healthkit-mindful.sh.
const READ_SCOPES = [
  "activity",
  "calories",
  "distance",
  "duration",
  "restingHeartRate",
  "heartRateVariabilitySDNN",
  "respiratoryRate",
  "oxygenSaturation",
  "bodyTemperature",
  "sleepAnalysis",
  "mindfulSession",
];

// Bump whenever READ_SCOPES gains a new HealthKit type. Users who connected
// before the bump have never been asked for the new type, so the hook
// re-runs requestAuthorization once (iOS only prompts for the not-yet-decided
// types) before syncing. Stored per device in localStorage.
export const HEALTHKIT_SCOPES_VERSION = 2; // v2: + mindfulSession (Mindful Minutes)
const SCOPES_VERSION_KEY = "apple-health-scopes-version";

export function hasLatestHealthKitScopes(): boolean {
  try {
    return Number(localStorage.getItem(SCOPES_VERSION_KEY)) >= HEALTHKIT_SCOPES_VERSION;
  } catch {
    return true; // storage unavailable: never loop on re-prompting
  }
}

export function markHealthKitScopesCurrent(): void {
  try {
    localStorage.setItem(SCOPES_VERSION_KEY, String(HEALTHKIT_SCOPES_VERSION));
  } catch {
    // ignore — worst case we ask again next launch
  }
}

// Daily health metrics sent to /api/apple-health/metrics/sync. Any field may be
// null when the device has no reading for that signal on that day. HRV is read
// via a patched build of the plugin (heartRateVariabilitySDNN, in milliseconds).
export interface NormalizedDailyMetric {
  metricDate: string; // local calendar day "YYYY-MM-DD"
  restingHeartRate: number | null;
  hrv: number | null;
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  bodyTemperature: number | null;
  sleepDurationMin: number | null;
  deepSleepMin: number | null;
  remSleepMin: number | null;
  // Passive activity totals for the whole day (no recorded workout required).
  exerciseMinutes: number | null;
  activeEnergyKcal: number | null;
  distanceMeters: number | null;
  // The day's main continuous activity burst (a workout the user didn't record).
  burstStart: string | null; // ISO
  burstEnd: string | null; // ISO
  burstExerciseMinutes: number | null;
  burstActiveEnergyKcal: number | null;
  burstDistanceMeters: number | null;
}

// HealthKit is only available inside the native iOS app.
export function isHealthKitAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export function getHealthKitScopes(): string[] {
  return [...READ_SCOPES];
}

// Prompts the iOS permission sheet. Returns false on web/Android or if HealthKit
// is not available on the device.
export async function requestHealthKitAuthorization(): Promise<boolean> {
  if (!isHealthKitAvailable()) return false;
  const { CapacitorHealthkit } = await import("@perfood/capacitor-healthkit");
  try {
    await CapacitorHealthkit.isAvailable();
  } catch {
    return false;
  }
  await CapacitorHealthkit.requestAuthorization({
    all: [],
    read: READ_SCOPES,
    write: [],
  });
  markHealthKitScopesCurrent();
  return true;
}

// Reads recent Apple Health "Mindful Minutes" sessions (meditation, breathing,
// prayer apps) and normalizes them into the same shape as workouts so they
// flow through the existing sync/claim pipeline. Requires the patched plugin
// (scripts/patch-healthkit-mindful.sh); on an older native build, or before the
// user has answered the Mindful Minutes permission, the plugin rejects the
// query — that is swallowed here so it can never break the workout sync.
export async function readRecentMindfulSessions(sinceDays = 30): Promise<NormalizedWorkout[]> {
  if (!isHealthKitAvailable()) return [];
  const { CapacitorHealthkit } = await import("@perfood/capacitor-healthkit");
  const end = new Date();
  const start = new Date(end.getTime() - sinceDays * 24 * 60 * 60 * 1000);

  let rows: any[] = [];
  try {
    const result = await CapacitorHealthkit.queryHKitSampleType<any>({
      sampleName: "mindfulSession",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: 200,
    });
    rows = result?.resultData ?? [];
  } catch (err) {
    console.warn("Apple Health mindful sessions unavailable:", err);
    return [];
  }

  const minSec = MIN_MINDFUL_SESSION_MINUTES * 60;
  return rows
    .filter((s) => s && s.uuid && s.startDate && s.endDate)
    .filter((s) => Number.isFinite(new Date(s.startDate).getTime()) && Number.isFinite(new Date(s.endDate).getTime()))
    .map((s) => {
      return {
        healthKitWorkoutId: String(s.uuid),
        activityType: HEALTHKIT_MINDFUL_SESSION_TYPE,
        startTime: new Date(s.startDate).toISOString(),
        endTime: new Date(s.endDate).toISOString(),
        // A mindful session's length is its start→end interval (no separate
        // active-time concept), and the server recomputes it the same way.
        durationSec: mindfulSessionDurationSec(s.startDate, s.endDate),
        distanceMeters: 0,
        energyKcal: 0,
        avgHeartRate: 0,
        routePolyline: null,
        // Keep only what the UI shows (which app recorded it); skip the bulky
        // device block.
        raw: {
          kind: "mindfulSession",
          source: typeof s.source === "string" ? s.source : null,
          sourceBundleId: typeof s.sourceBundleId === "string" ? s.sourceBundleId : null,
          timeZone: typeof s.timeZone === "string" ? s.timeZone : null,
        },
      };
    })
    .filter((s) => s.durationSec >= minSec);
}

// Reads recent workouts from HealthKit and normalizes them. No-ops on web.
export async function readRecentWorkouts(sinceDays = 30): Promise<NormalizedWorkout[]> {
  if (!isHealthKitAvailable()) return [];
  const { CapacitorHealthkit } = await import("@perfood/capacitor-healthkit");
  const end = new Date();
  const start = new Date(end.getTime() - sinceDays * 24 * 60 * 60 * 1000);

  const result = await CapacitorHealthkit.queryHKitSampleType<any>({
    sampleName: "workoutType",
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    limit: 200,
  });

  const rows: any[] = result?.resultData ?? [];
  return rows
    .filter((w) => w && w.uuid)
    .map((w) => {
      const startMs = new Date(w.startDate).getTime();
      const endMs = new Date(w.endDate).getTime();
      // The plugin's `duration` field is unreliable — it is sometimes missing,
      // 0, or a tiny bogus value (e.g. 2 seconds for a 99-minute match), so we
      // reconcile it against the wall-clock elapsed time (see helper above).
      const reportedSec = Math.max(0, Math.round(Number(w.duration) || 0));
      const elapsedSec = Number.isFinite(startMs) && Number.isFinite(endMs)
        ? Math.max(0, Math.round((endMs - startMs) / 1000))
        : 0;
      return {
      healthKitWorkoutId: String(w.uuid),
      activityType: String(w.workoutActivityName || "Workout"),
      startTime: new Date(w.startDate).toISOString(),
      endTime: new Date(w.endDate).toISOString(),
      durationSec: reconcileWorkoutDurationSec(reportedSec, elapsedSec),
      distanceMeters: Math.max(0, Math.round(Number(w.totalDistance) || 0)),
      energyKcal: Math.max(0, Math.round(Number(w.totalEnergyBurned) || 0)),
      avgHeartRate: 0,
      routePolyline: null,
      raw: w,
      };
    });
}

// Converts a Date to a local "YYYY-MM-DD" string.
function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Reads a single numeric sample type and groups daily averages by local day.
async function readDailyAverages(
  sampleName: string,
  start: Date,
  end: Date,
): Promise<Record<string, number>> {
  const { CapacitorHealthkit } = await import("@perfood/capacitor-healthkit");
  let rows: any[] = [];
  try {
    const result = await CapacitorHealthkit.queryHKitSampleType<any>({
      sampleName,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: 0,
    });
    rows = result?.resultData ?? [];
  } catch {
    return {};
  }
  const sums: Record<string, { total: number; count: number }> = {};
  for (const r of rows) {
    const when = r?.startDate ?? r?.endDate;
    const value = Number(r?.value);
    if (!when || !Number.isFinite(value)) continue;
    const key = localDayKey(new Date(when));
    if (!sums[key]) sums[key] = { total: 0, count: 0 };
    sums[key].total += value;
    sums[key].count += 1;
  }
  const out: Record<string, number> = {};
  for (const [key, { total, count }] of Object.entries(sums)) {
    if (count > 0) out[key] = total / count;
  }
  return out;
}

// A raw timestamped sample: `value` accrued over [start, end] (ms epoch).
interface RawSample {
  start: number;
  end: number;
  value: number;
}

// Reads raw timestamped samples for a cumulative quantity type (exercise
// minutes, active calories, distance), sorted by start time. Returning the
// individual samples (rather than only a daily sum) lets us detect the day's
// workout "burst" — see computeDailyBursts.
async function readRawSamples(
  sampleName: string,
  start: Date,
  end: Date,
): Promise<RawSample[]> {
  const { CapacitorHealthkit } = await import("@perfood/capacitor-healthkit");
  let rows: any[] = [];
  try {
    const result = await CapacitorHealthkit.queryHKitSampleType<any>({
      sampleName,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: 0,
    });
    rows = result?.resultData ?? [];
  } catch {
    return [];
  }
  const out: RawSample[] = [];
  for (const r of rows) {
    const s = r?.startDate ? new Date(r.startDate).getTime() : NaN;
    const eRaw = r?.endDate ? new Date(r.endDate).getTime() : s;
    const value = Number(r?.value);
    if (!Number.isFinite(s) || !Number.isFinite(value)) continue;
    const e = Number.isFinite(eRaw) ? Math.max(s, eRaw) : s;
    out.push({ start: s, end: e, value });
  }
  out.sort((a, b) => a.start - b.start);
  return out;
}

// Sums raw samples into per-local-day totals (the whole-day figure).
function sumByDay(samples: RawSample[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of samples) {
    const key = localDayKey(new Date(s.start));
    out[key] = (out[key] ?? 0) + s.value;
  }
  return out;
}

// The day's single biggest continuous activity "burst": exercise minutes,
// active calories and distance recorded during one continuous window. Used to
// represent a workout the user didn't formally record, instead of crediting the
// whole day's incidental movement.
export interface DailyBurst {
  startTime: string; // ISO
  endTime: string; // ISO
  exerciseMinutes: number;
  activeEnergyKcal: number;
  distanceMeters: number;
}

// Largest gap (ms) allowed inside one burst. Apple only accrues "exercise
// minutes" during brisk moments, so a single workout shows up as several blocks
// with rests in between (e.g. a 19-min block then an 8-min block = one 27-min
// session). A 45-minute gap merges those in-session rests and adjacent blocks
// into one workout, while incidental daily movement — which on the activity
// chart is separated by multiple empty hours — stays as its own small bursts
// and is excluded.
const BURST_GAP_MS = 45 * 60 * 1000;

// For each local day, finds the biggest continuous burst of exercise minutes
// and totals the active energy + distance recorded during that same window.
function computeDailyBursts(
  exercise: RawSample[],
  energy: RawSample[],
  distance: RawSample[],
): Record<string, DailyBurst> {
  // Group positive exercise-minute samples by local day.
  const byDay: Record<string, RawSample[]> = {};
  for (const s of exercise) {
    if (s.value <= 0) continue;
    const key = localDayKey(new Date(s.start));
    (byDay[key] ??= []).push(s);
  }
  // Sum another series within a [from, to] window. A sample's value is prorated
  // to the fraction of it that overlaps the window (a sample straddling the edge
  // only contributes its overlapping share), so calories/distance aren't
  // over-credited. Instantaneous (zero-duration) samples count fully if inside.
  const sumOverlap = (samples: RawSample[], from: number, to: number): number => {
    let total = 0;
    for (const s of samples) {
      const dur = s.end - s.start;
      if (dur <= 0) {
        if (s.start >= from && s.start < to) total += s.value;
        continue;
      }
      const overlap = Math.min(s.end, to) - Math.max(s.start, from);
      if (overlap > 0) total += s.value * (overlap / dur);
    }
    return total;
  };
  const out: Record<string, DailyBurst> = {};
  for (const [key, samples] of Object.entries(byDay)) {
    // Walk samples, accumulating a cluster until a gap exceeds the threshold;
    // keep the cluster with the most exercise minutes.
    let best: { start: number; end: number; minutes: number } | null = null;
    let curStart = samples[0].start;
    let curEnd = samples[0].end;
    let curMin = samples[0].value;
    const flush = () => {
      if (!best || curMin > best.minutes) {
        best = { start: curStart, end: curEnd, minutes: curMin };
      }
    };
    for (let i = 1; i < samples.length; i++) {
      const s = samples[i];
      if (s.start - curEnd <= BURST_GAP_MS) {
        curEnd = Math.max(curEnd, s.end);
        curMin += s.value;
      } else {
        flush();
        curStart = s.start;
        curEnd = s.end;
        curMin = s.value;
      }
    }
    flush();
    if (!best) continue;
    const b: { start: number; end: number; minutes: number } = best;
    out[key] = {
      startTime: new Date(b.start).toISOString(),
      endTime: new Date(b.end).toISOString(),
      exerciseMinutes: b.minutes,
      activeEnergyKcal: sumOverlap(energy, b.start, b.end),
      distanceMeters: sumOverlap(distance, b.start, b.end),
    };
  }
  return out;
}

// Classifies a HealthKit sleep sample's stage from its value/string. Apple's
// sleep stage labels vary across iOS versions, so we match loosely.
function sleepStage(raw: any): "deep" | "rem" | "asleep" | "other" {
  const v = String(raw?.value ?? raw?.sleepState ?? "").toLowerCase();
  if (v.includes("deep")) return "deep";
  if (v.includes("rem")) return "rem";
  if (v.includes("awake") || v.includes("inbed") || v.includes("in_bed")) return "other";
  if (v.includes("asleep") || v.includes("core") || v.includes("unspecified")) return "asleep";
  // Numeric encodings: 1 = inBed/awake, >=2 = some asleep stage.
  const n = Number(raw?.value);
  if (Number.isFinite(n)) {
    if (n >= 3) return "asleep";
    if (n === 2) return "asleep";
  }
  return "other";
}

// Reads sleep samples and totals asleep / deep / REM minutes per local day.
// A night is attributed to the day it ends on (matching how Apple shows sleep).
async function readDailySleep(
  start: Date,
  end: Date,
): Promise<Record<string, { total: number; deep: number; rem: number }>> {
  const { CapacitorHealthkit } = await import("@perfood/capacitor-healthkit");
  let rows: any[] = [];
  try {
    const result = await CapacitorHealthkit.queryHKitSampleType<any>({
      sampleName: "sleepAnalysis",
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: 0,
    });
    rows = result?.resultData ?? [];
  } catch {
    return {};
  }
  const out: Record<string, { total: number; deep: number; rem: number }> = {};
  for (const r of rows) {
    const s = r?.startDate ? new Date(r.startDate).getTime() : NaN;
    const e = r?.endDate ? new Date(r.endDate).getTime() : NaN;
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) continue;
    const stage = sleepStage(r);
    if (stage === "other") continue;
    const minutes = (e - s) / 60000;
    const key = localDayKey(new Date(e));
    if (!out[key]) out[key] = { total: 0, deep: 0, rem: 0 };
    out[key].total += minutes;
    if (stage === "deep") out[key].deep += minutes;
    if (stage === "rem") out[key].rem += minutes;
  }
  return out;
}

// Reads recent daily health metrics from HealthKit. No-ops on web.
export async function readDailyHealthMetrics(sinceDays = 90): Promise<NormalizedDailyMetric[]> {
  if (!isHealthKitAvailable()) return [];
  const end = new Date();
  const start = new Date(end.getTime() - sinceDays * 24 * 60 * 60 * 1000);

  const [rhr, hrv, resp, spo2, temp, sleep, exerciseRaw, activeEnergyRaw, distanceRaw] =
    await Promise.all([
      readDailyAverages("restingHeartRate", start, end),
      readDailyAverages("heartRateVariabilitySDNN", start, end),
      readDailyAverages("respiratoryRate", start, end),
      readDailyAverages("oxygenSaturation", start, end),
      readDailyAverages("bodyTemperature", start, end),
      readDailySleep(start, end),
      // Cumulative quantities — read raw samples so we can derive both the
      // whole-day sum AND the day's workout burst from the same data.
      readRawSamples("appleExerciseTime", start, end),
      readRawSamples("activeEnergyBurned", start, end),
      readRawSamples("distanceWalkingRunning", start, end),
    ]);

  const exercise = sumByDay(exerciseRaw);
  const activeEnergy = sumByDay(activeEnergyRaw);
  const distance = sumByDay(distanceRaw);
  const bursts = computeDailyBursts(exerciseRaw, activeEnergyRaw, distanceRaw);

  const days = new Set<string>([
    ...Object.keys(rhr),
    ...Object.keys(hrv),
    ...Object.keys(resp),
    ...Object.keys(spo2),
    ...Object.keys(temp),
    ...Object.keys(sleep),
    ...Object.keys(exercise),
    ...Object.keys(activeEnergy),
    ...Object.keys(distance),
  ]);

  return Array.from(days)
    .sort()
    .map((metricDate) => ({
      metricDate,
      restingHeartRate: rhr[metricDate] ?? null,
      hrv: hrv[metricDate] ?? null,
      respiratoryRate: resp[metricDate] ?? null,
      oxygenSaturation: spo2[metricDate] ?? null,
      bodyTemperature: temp[metricDate] ?? null,
      sleepDurationMin: sleep[metricDate]?.total ?? null,
      deepSleepMin: sleep[metricDate]?.deep ?? null,
      remSleepMin: sleep[metricDate]?.rem ?? null,
      exerciseMinutes: exercise[metricDate] ?? null,
      activeEnergyKcal: activeEnergy[metricDate] ?? null,
      distanceMeters: distance[metricDate] ?? null,
      burstStart: bursts[metricDate]?.startTime ?? null,
      burstEnd: bursts[metricDate]?.endTime ?? null,
      burstExerciseMinutes: bursts[metricDate]?.exerciseMinutes ?? null,
      burstActiveEnergyKcal: bursts[metricDate]?.activeEnergyKcal ?? null,
      burstDistanceMeters: bursts[metricDate]?.distanceMeters ?? null,
    }));
}

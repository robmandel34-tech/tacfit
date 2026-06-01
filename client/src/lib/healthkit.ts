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
export function reconcileWorkoutDurationSec(reportedSec: number, elapsedSec: number): number {
  const reported = Number.isFinite(reportedSec) ? Math.max(0, Math.round(reportedSec)) : 0;
  const elapsed = Number.isFinite(elapsedSec) ? Math.max(0, Math.round(elapsedSec)) : 0;
  if (reported > 0 && elapsed > 0) {
    return reported < elapsed * 0.2 ? elapsed : reported;
  }
  return Math.max(reported, elapsed);
}

// HealthKit read scopes we request. These map to @perfood/capacitor-healthkit
// authorization option keys. The second group powers the Readiness score
// (resting HR, respiratory rate, blood oxygen, body temperature, sleep).
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
];

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
  return true;
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

  const [rhr, hrv, resp, spo2, temp, sleep] = await Promise.all([
    readDailyAverages("restingHeartRate", start, end),
    readDailyAverages("heartRateVariabilitySDNN", start, end),
    readDailyAverages("respiratoryRate", start, end),
    readDailyAverages("oxygenSaturation", start, end),
    readDailyAverages("bodyTemperature", start, end),
    readDailySleep(start, end),
  ]);

  const days = new Set<string>([
    ...Object.keys(rhr),
    ...Object.keys(hrv),
    ...Object.keys(resp),
    ...Object.keys(spo2),
    ...Object.keys(temp),
    ...Object.keys(sleep),
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
    }));
}

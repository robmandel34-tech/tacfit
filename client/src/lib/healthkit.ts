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

// HealthKit read scopes we request. These map to @perfood/capacitor-healthkit
// authorization option keys.
const READ_SCOPES = ["activity", "calories", "distance", "duration"];

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
      // The plugin's `duration` field is often missing or 0, so fall back to
      // the elapsed time between the workout's start and end timestamps.
      const reportedSec = Math.max(0, Math.round(Number(w.duration) || 0));
      const elapsedSec = Number.isFinite(startMs) && Number.isFinite(endMs)
        ? Math.max(0, Math.round((endMs - startMs) / 1000))
        : 0;
      return {
      healthKitWorkoutId: String(w.uuid),
      activityType: String(w.workoutActivityName || "Workout"),
      startTime: new Date(w.startDate).toISOString(),
      endTime: new Date(w.endDate).toISOString(),
      durationSec: reportedSec > 0 ? reportedSec : elapsedSec,
      distanceMeters: Math.max(0, Math.round(Number(w.totalDistance) || 0)),
      energyKcal: Math.max(0, Math.round(Number(w.totalEnergyBurned) || 0)),
      avgHeartRate: 0,
      routePolyline: null,
      raw: w,
      };
    });
}

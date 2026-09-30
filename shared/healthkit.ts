// Maps Apple HealthKit workout types to TacFit activity-type `name` values
// (the same strings stored in competitions.requiredActivities and activity_types.name).
//
// HealthKit workout types are normalized to lowercase string keys before lookup.
// The plugin layer is responsible for converting HKWorkoutActivityType into one of
// these keys (see client/src/lib/healthkit.ts).

export const HEALTHKIT_TO_TACFIT: Record<string, string> = {
  // Cardio
  running: "run",
  trailrunning: "trail_run",
  walking: "walk",
  hiking: "hike",
  cycling: "bike ride",
  handcycling: "handcycle",
  swimming: "swim",
  rowing: "rowing",
  elliptical: "elliptical",
  stairclimbing: "stair_stepper",
  stairs: "stair_stepper",
  stepperultraining: "stair_stepper",
  highintensityintervaltraining: "cardio",
  mixedcardio: "cardio",
  cardiodance: "cardio",
  jumprope: "cardio",
  crosstraining: "workout",

  // Strength
  traditionalstrengthtraining: "strength",
  functionalstrengthtraining: "strength",
  coretraining: "strength",
  weighttraining: "weight_training",

  // Mobility / flexibility
  yoga: "yoga",
  flexibility: "flexibility",
  pilates: "flexibility",
  cooldown: "flexibility",
  preparationandrecovery: "flexibility",

  // Mind / meditation
  mindandbody: "mindfulness",
  mindfulness: "mindfulness",
  meditation: "meditation/prayer",
  // Apple Health "Mindful Minutes" sessions (see HEALTHKIT_MINDFUL_SESSION_TYPE).
  // Every session lands on the combined meditation/prayer type; the user can
  // relabel it (breathing, mindfulness, ...) before submitting.
  mindfulsession: "meditation/prayer",

  // Sports
  basketball: "basketball",
  soccer: "soccer",
  americanfootball: "american_football",
  baseball: "baseball",
  softball: "softball",
  tennis: "tennis",
  tabletennis: "table_tennis",
  badminton: "badminton",
  pickleball: "pickleball",
  racquetball: "racquetball",
  squash: "squash",
  volleyball: "volleyball",
  golf: "golf",
  climbing: "climbing",
  rockclimbing: "rock_climbing",
  surfingsports: "surf",
  paddlesports: "stand_up_paddling",
  sailing: "sail",
  snowboarding: "snowboard",
  downhillskiing: "alpine_ski",
  crosscountryskiing: "nordic_ski",
  snowsports: "snowshoe",
  skatingsports: "ice_skate",
};

// Broad activity CATEGORIES. The platform has umbrella activity types that act
// as categories ("cardio" = Cardio Training, "strength" = Strength Operations,
// "flexibility" = Mobility Training, "mindfulness"). When a competition's
// requiredActivities lists one of these umbrella names, any specific activity in
// that category should count too — e.g. a competition that requires "cardio"
// should accept a synced "Running" workout (which maps to the specific "run"
// type), because running IS cardio. This map relates each specific activity-type
// `name` to its umbrella category name. Keys and values are lowercase to match
// how names are stored.
export const ACTIVITY_CATEGORY: Record<string, string> = {
  // Cardio family
  run: "cardio",
  trail_run: "cardio",
  virtual_run: "cardio",
  walk: "cardio",
  hike: "cardio",
  "bike ride": "cardio",
  ride: "cardio",
  virtual_ride: "cardio",
  e_bike_ride: "cardio",
  gravel_ride: "cardio",
  mountain_bike_ride: "cardio",
  e_mountain_bike_ride: "cardio",
  velomobile: "cardio",
  handcycle: "cardio",
  wheelchair: "cardio",
  swim: "cardio",
  rowing: "cardio",
  elliptical: "cardio",
  stair_stepper: "cardio",
  cardio: "cardio",

  // Strength family
  strength: "strength",
  weight_training: "strength",
  crossfit: "strength",

  // Mobility / flexibility family
  flexibility: "flexibility",
  yoga: "flexibility",

  // Mind / meditation family
  mindfulness: "mindfulness",
  "meditation/prayer": "mindfulness",
  breathing_exercises: "mindfulness",
  body_scan: "mindfulness",
  loving_kindness: "mindfulness",
};

// True if `activityName` satisfies a competition's `required` activity list.
// An activity is allowed when its own name is required, OR when the broad
// category it belongs to is required (so requiring "cardio" accepts "run",
// "swim", etc.). Case-insensitive. An empty `required` means no restriction.
export function isActivityAllowed(activityName: string, required: string[]): boolean {
  if (!required || required.length === 0) return true;
  const name = (activityName || "").toString().trim().toLowerCase();
  if (!name) return false;
  const requiredLower = required.map((r) => (r || "").toString().trim().toLowerCase());
  if (requiredLower.includes(name)) return true;
  const category = ACTIVITY_CATEGORY[name];
  return !!category && requiredLower.includes(category);
}

// Raw HealthKit workout types that legitimately belong to MORE THAN ONE
// umbrella category. Functional strength training is circuit-style,
// heart-rate-elevating work, so cardio-only competitions accept it too
// (it still submits as a Strength activity).
export const HEALTHKIT_EXTRA_CATEGORIES: Record<string, string[]> = {
  functionalstrengthtraining: ["cardio"],
};

// True if a synced HealthKit workout (raw type) is eligible for a competition
// with the given `required` activity list. Maps the workout to its activity-type
// name first, then applies category-aware matching. Some raw types also count
// toward extra categories (see HEALTHKIT_EXTRA_CATEGORIES).
export function isHealthKitWorkoutEligible(rawType: string, required: string[]): boolean {
  if (!required || required.length === 0) return true;
  const mappedName = mapHealthKitTypeToActivityName(rawType);
  if (mappedName && isActivityAllowed(mappedName, required)) return true;
  const extras = HEALTHKIT_EXTRA_CATEGORIES[normalizeHealthKitType(rawType)] || [];
  if (extras.length === 0) return false;
  const requiredLower = required.map((r) => (r || "").toString().trim().toLowerCase());
  return extras.some((c) => requiredLower.includes(c));
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

// Minimum exercise minutes in a single passive burst for it to count as real
// exercise worth logging as an "Unspecified Activity". Anything shorter is
// treated as incidental daily movement and is not surfaced or accepted.
export const MIN_PASSIVE_EXERCISE_MINUTES = 10;

// --- Apple Health "Mindful Minutes" -------------------------------------------
// Meditation, breathing and prayer apps (Apple Mindfulness, Headspace, Calm,
// Hallow, ...) write HKCategoryTypeIdentifier.mindfulSession samples, NOT
// workouts. We import them through the same synced-workout pipeline (table,
// dedupe by HealthKit UUID, one-time claim, competition eligibility) under this
// raw activityType so every downstream rule keeps working unchanged. HealthKit
// UUIDs are unique across sample types, so they can't collide with workouts.
export const HEALTHKIT_MINDFUL_SESSION_TYPE = "Mindful Session";

// Sessions shorter than this are treated as accidental taps / app noise and are
// neither synced nor accepted (mirrors MIN_PASSIVE_EXERCISE_MINUTES).
export const MIN_MINDFUL_SESSION_MINUTES = 5;

// True if a synced Apple Health entry is a Mindful Minutes session rather than
// a recorded workout.
export function isMindfulSessionType(raw: string): boolean {
  return normalizeHealthKitType(raw) === "mindfulsession";
}

// Human label for a synced Apple Health entry. Workout types are already
// display-ready ("Running"); mindful sessions read as "Meditation" so the user
// recognizes them, even though they can relabel the activity type before
// submitting.
export function healthKitActivityLabel(raw: string): string {
  return isMindfulSessionType(raw) ? "Meditation" : raw;
}

// Which activity types a Mindful Minutes session may be logged as. The user
// can relabel within the mindfulness family (meditation/prayer, breathing,
// body scan, ...) but not turn a meditation into a run. Enforced on the server
// at submission and used to filter the client dropdown.
export function isMindfulRelabelAllowed(activityName: string): boolean {
  const name = (activityName || "").toString().trim().toLowerCase();
  return !!name && ACTIVITY_CATEGORY[name] === "mindfulness";
}

// Effective length of a Mindful Minutes session. Category samples have no
// separate "active" duration — the session IS the start→end interval — so the
// wall-clock elapsed time is authoritative and any reported duration is
// ignored. (Prevents a crafted payload from pairing a 30-second interval with
// a one-hour durationSec to pass the minimum and inflate points.)
export function mindfulSessionDurationSec(startTime: Date | string, endTime: Date | string): number {
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  return Math.max(0, Math.round((endMs - startMs) / 1000));
}

// Normalize a raw HealthKit workout type string to a lookup key.
export function normalizeHealthKitType(raw: string): string {
  return (raw || "").toString().trim().toLowerCase().replace(/[\s_-]+/g, "");
}

// Map a HealthKit workout type to a TacFit activity-type name (or null if no mapping).
export function mapHealthKitTypeToActivityName(raw: string): string | null {
  const key = normalizeHealthKitType(raw);
  return HEALTHKIT_TO_TACFIT[key] ?? null;
}

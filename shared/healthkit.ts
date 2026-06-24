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

// True if a synced HealthKit workout (raw type) is eligible for a competition
// with the given `required` activity list. Maps the workout to its activity-type
// name first, then applies category-aware matching.
export function isHealthKitWorkoutEligible(rawType: string, required: string[]): boolean {
  if (!required || required.length === 0) return true;
  const mappedName = mapHealthKitTypeToActivityName(rawType);
  if (!mappedName) return false;
  return isActivityAllowed(mappedName, required);
}

// Minimum exercise minutes in a single passive burst for it to count as real
// exercise worth logging as an "Unspecified Activity". Anything shorter is
// treated as incidental daily movement and is not surfaced or accepted.
export const MIN_PASSIVE_EXERCISE_MINUTES = 10;

// Normalize a raw HealthKit workout type string to a lookup key.
export function normalizeHealthKitType(raw: string): string {
  return (raw || "").toString().trim().toLowerCase().replace(/[\s_-]+/g, "");
}

// Map a HealthKit workout type to a TacFit activity-type name (or null if no mapping).
export function mapHealthKitTypeToActivityName(raw: string): string | null {
  const key = normalizeHealthKitType(raw);
  return HEALTHKIT_TO_TACFIT[key] ?? null;
}

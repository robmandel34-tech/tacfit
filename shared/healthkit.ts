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

// Normalize a raw HealthKit workout type string to a lookup key.
export function normalizeHealthKitType(raw: string): string {
  return (raw || "").toString().trim().toLowerCase().replace(/[\s_-]+/g, "");
}

// Map a HealthKit workout type to a TacFit activity-type name (or null if no mapping).
export function mapHealthKitTypeToActivityName(raw: string): string | null {
  const key = normalizeHealthKitType(raw);
  return HEALTHKIT_TO_TACFIT[key] ?? null;
}

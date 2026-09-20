// How a camera-verified session checks an activity type. Shared by the admin
// form, the activity-type routes, and the session page so all three agree.
//
//   "time" — stay in frame for a set number of minutes (face presence + noise)
//   "reps" — on-device pose tracking counts each rep against a target

export const VERIFIED_SESSION_MODES = ["time", "reps"] as const;
export type VerifiedSessionMode = (typeof VERIFIED_SESSION_MODES)[number];

export function isVerifiedSessionMode(value: unknown): value is VerifiedSessionMode {
  return typeof value === "string" && (VERIFIED_SESSION_MODES as readonly string[]).includes(value);
}

// "reps", "Reps", "repetitions", "rep count" all mean the activity is counted,
// not timed.
export function isRepsUnit(unit: string | null | undefined): boolean {
  return /\brep(s|etitions?)?\b/i.test(unit ?? "");
}

// Exercises the on-device rep counter knows how to track. The session page's
// tracking table is typed against these keys, so adding an exercise there
// without listing it here (or vice versa) fails to compile.
export const SUPPORTED_REP_EXERCISES = {
  push_ups: "Push-ups",
  squats: "Squats",
  pull_ups: "Pull-ups",
  lunges: "Lunges",
  burpees: "Burpees",
  rowing: "Rowing",
  jumping_jacks: "Jumping jacks",
  mountain_climbers: "Mountain climbers",
  jump_rope: "Jump rope",
} as const;
export type RepExerciseKey = keyof typeof SUPPORTED_REP_EXERCISES;
export const SUPPORTED_REP_EXERCISE_LIST = Object.values(SUPPORTED_REP_EXERCISES).join(", ");

// Which supported exercise an activity type is, judged from its name (what the
// session page keys on) and then its display name. Undefined means the camera
// has no rep counter for it, so it must not run in reps mode.
export function resolveRepExercise(
  type: { name?: string | null; displayName?: string | null } | null | undefined,
): RepExerciseKey | undefined {
  const keys = Object.keys(SUPPORTED_REP_EXERCISES) as RepExerciseKey[];
  for (const candidate of [type?.name, type?.displayName]) {
    const match = matchActivityKey(candidate, keys);
    if (match) return match as RepExerciseKey;
  }
  return undefined;
}

// Picks the mode for an activity type when the admin didn't choose one
// explicitly (older app builds don't send the field). A reps-style unit on an
// exercise the camera can count means reps; anything else is timed.
export function defaultVerifiedSessionMode(
  type: { measurementUnit?: string | null; name?: string | null; displayName?: string | null },
): VerifiedSessionMode {
  return isRepsUnit(type.measurementUnit) && resolveRepExercise(type) ? "reps" : "time";
}

// Exercises the rep counter knows how to track, keyed the way the tracking
// table on the session page is keyed. Admins type free-form names ("Push Ups",
// "Pull-Ups", "pushups"), so lookups go through this normalizer.
const REP_TRACKING_ALIASES: Record<string, string> = {
  push_up: "push_ups",
  pushup: "push_ups",
  pushups: "push_ups",
  press_up: "push_ups",
  press_ups: "push_ups",
  squat: "squats",
  air_squat: "squats",
  air_squats: "squats",
  pull_up: "pull_ups",
  pullup: "pull_ups",
  pullups: "pull_ups",
  chin_up: "pull_ups",
  chin_ups: "pull_ups",
  chinup: "pull_ups",
  chinups: "pull_ups",
  lunge: "lunges",
  burpee: "burpees",
  jumping_jack: "jumping_jacks",
  jumpingjack: "jumping_jacks",
  jumpingjacks: "jumping_jacks",
  star_jump: "jumping_jacks",
  star_jumps: "jumping_jacks",
  mountain_climber: "mountain_climbers",
  mountainclimber: "mountain_climbers",
  mountainclimbers: "mountain_climbers",
  jumprope: "jump_rope",
  skipping: "jump_rope",
  skipping_rope: "jump_rope",
};

export function normalizeActivityKey(name: string | null | undefined): string {
  const key = (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (REP_TRACKING_ALIASES[key]) return REP_TRACKING_ALIASES[key];
  // Alias token by token too, so "weighted pushups" → "weighted_push_ups".
  return key
    .split("_")
    .map((token) => REP_TRACKING_ALIASES[token] ?? token)
    .join("_");
}

// Finds which known key (e.g. a rep-tracking table entry) an activity type
// name refers to. Exact match first; otherwise the longest known key that
// appears as a whole word run inside the name, singular or plural
// ("Weighted Push-Up" → push_ups, "Hot Yoga" → yoga). Undefined when nothing
// matches.
export function matchActivityKey(
  name: string | null | undefined,
  knownKeys: Iterable<string>,
): string | undefined {
  const key = normalizeActivityKey(name);
  const known = Array.from(knownKeys);
  if (known.includes(key)) return key;
  const padded = `_${key}_`;
  return known
    .filter((k) => padded.includes(`_${k}_`) || padded.includes(`_${k.replace(/s$/, "")}_`))
    .sort((a, b) => b.length - a.length)[0];
}

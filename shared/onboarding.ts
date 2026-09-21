// Onboarding check-in: "How would you rate your current level of fitness?"
// Single source of truth for the option values the client offers and the
// server accepts (stored in users.fitness_archetype).

export const FITNESS_LEVEL_OPTIONS = [
  { value: "excellent", label: "Excellent" },
  { value: "just_ok", label: "Just Ok" },
  { value: "struggling", label: "Struggling" },
] as const;

export type FitnessLevel = (typeof FITNESS_LEVEL_OPTIONS)[number]["value"];

export const FITNESS_LEVEL_VALUES: readonly string[] = FITNESS_LEVEL_OPTIONS.map(
  (o) => o.value,
);

export function isFitnessLevel(value: unknown): value is FitnessLevel {
  return typeof value === "string" && FITNESS_LEVEL_VALUES.includes(value);
}

// Values written by the original version of this question (app builds through
// iOS 1.0.4 still send them). They stay accepted on write so older installs
// keep saving their answer, and stay readable when displayed.
const LEGACY_LABELS = {
  servant: "Excellent",
  clown: "Inconsistent",
  survivor: "Struggling",
} as const satisfies Record<string, string>;

function isLegacyFitnessLevel(value: unknown): value is keyof typeof LEGACY_LABELS {
  // Own-property check: `in` would also accept "constructor", "__proto__", etc.
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(LEGACY_LABELS, value);
}

// What the server accepts: the current options plus the legacy tokens.
export function isAcceptedFitnessLevel(value: unknown): value is string {
  return isFitnessLevel(value) || isLegacyFitnessLevel(value);
}

export function fitnessLevelLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  const current = FITNESS_LEVEL_OPTIONS.find((o) => o.value === value);
  if (current) return current.label;
  return isLegacyFitnessLevel(value) ? LEGACY_LABELS[value] : value;
}

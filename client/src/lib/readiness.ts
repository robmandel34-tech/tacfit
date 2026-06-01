// Shared readiness display helpers.
//
// The backend returns a readiness record as { score, bucket, state }:
//   - state "ready"        -> bucket is one of stand_down / limited_duty /
//                             field_ready / combat_ready / optimal_force
//   - state "calibrating"  -> still building the personal baseline (no score yet)
//   - state "insufficient" -> not enough synced health data to score
//
// These helpers map ANY of those states to a visible ring + label so the
// readiness indicator is never silently invisible.

export type ReadinessData = {
  score: number | null;
  bucket: string | null;
  state: string;
};

export type ReadinessDisplay = {
  // Tailwind ring classes for an avatar.
  ring: string;
  // Background color for a small status dot.
  dot: string;
  // Text color for the label.
  text: string;
  // Short status word shown next to the avatar.
  label: string;
  // One-line explanation for cards/tooltips.
  description: string;
  // The numeric score (0-100) when available, else null.
  score: number | null;
  // True when there is meaningful readiness to surface (a real score or an
  // in-progress calibration). False for "no data yet" so compact views can
  // choose to hide it.
  active: boolean;
};

export function getReadinessDisplay(
  readiness?: ReadinessData | null,
): ReadinessDisplay | null {
  if (!readiness) return null;

  if (readiness.state === "ready" && readiness.bucket) {
    // Normalize legacy/unknown bucket values (e.g. rows scored before the tier
    // rename) by deriving the tier from the score, so a "ready" record never
    // falls through to "No data".
    const TIERS = ["stand_down", "limited_duty", "field_ready", "combat_ready", "optimal_force"];
    let bucket = readiness.bucket;
    if (!TIERS.includes(bucket) && readiness.score != null) {
      const s = readiness.score;
      bucket =
        s >= 80 ? "optimal_force"
        : s >= 60 ? "combat_ready"
        : s >= 40 ? "field_ready"
        : s >= 20 ? "limited_duty"
        : "stand_down";
    }
    switch (bucket) {
      case "optimal_force":
        return {
          ring: "ring-2 ring-green-500",
          dot: "bg-green-500",
          text: "text-green-400",
          label: "Optimal Force",
          description: "Peak readiness — cleared to go all in.",
          score: readiness.score,
          active: true,
        };
      case "combat_ready":
        return {
          ring: "ring-2 ring-lime-500",
          dot: "bg-lime-500",
          text: "text-lime-400",
          label: "Combat Ready",
          description: "Cleared to push hard today.",
          score: readiness.score,
          active: true,
        };
      case "field_ready":
        return {
          ring: "ring-2 ring-yellow-500",
          dot: "bg-yellow-500",
          text: "text-yellow-400",
          label: "Field Ready",
          description: "Train, but keep some in reserve.",
          score: readiness.score,
          active: true,
        };
      case "limited_duty":
        return {
          ring: "ring-2 ring-orange-500",
          dot: "bg-orange-500",
          text: "text-orange-400",
          label: "Limited Duty",
          description: "Keep it light — your body is under load.",
          score: readiness.score,
          active: true,
        };
      case "stand_down":
        return {
          ring: "ring-2 ring-red-500",
          dot: "bg-red-500",
          text: "text-red-400",
          label: "Stand Down",
          description: "Prioritize recovery today.",
          score: readiness.score,
          active: true,
        };
    }
  }

  if (readiness.state === "calibrating") {
    return {
      ring: "ring-2 ring-sky-500",
      dot: "bg-sky-500",
      text: "text-sky-300",
      label: "Calibrating",
      description: "Keep syncing Apple Health — building your baseline.",
      score: null,
      active: true,
    };
  }

  // "insufficient" or any unknown state: no usable score yet.
  return {
    ring: "ring-2 ring-slate-500/50",
    dot: "bg-slate-500",
    text: "text-slate-300",
    label: "No data",
    description: "Connect Apple Health to see your readiness.",
    score: null,
    active: false,
  };
}

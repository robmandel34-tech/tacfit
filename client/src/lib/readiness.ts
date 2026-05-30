// Shared readiness display helpers.
//
// The backend returns a readiness record as { score, bucket, state }:
//   - state "ready"        -> bucket is one of ready/moderate/fatigued/rest
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
    switch (readiness.bucket) {
      case "ready":
        return {
          ring: "ring-2 ring-green-500",
          dot: "bg-green-500",
          text: "text-green-400",
          label: "Ready",
          description: "Primed to train hard today.",
          score: readiness.score,
          active: true,
        };
      case "moderate":
        return {
          ring: "ring-2 ring-yellow-500",
          dot: "bg-yellow-500",
          text: "text-yellow-400",
          label: "Moderate",
          description: "Train, but keep some in reserve.",
          score: readiness.score,
          active: true,
        };
      case "fatigued":
        return {
          ring: "ring-2 ring-orange-500",
          dot: "bg-orange-500",
          text: "text-orange-400",
          label: "Fatigued",
          description: "Ease off — your body is under load.",
          score: readiness.score,
          active: true,
        };
      case "rest":
        return {
          ring: "ring-2 ring-red-500",
          dot: "bg-red-500",
          text: "text-red-400",
          label: "Rest",
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

// Effort-based activity points, shared by server (authoritative award) and
// client (previews / help copy). One place so numbers never drift.
//
// Scheme (replaces the old flat 15/30 and flat 50 verified):
// - Minutes-based activities: 1 point per minute, up to EFFORT_CAP.
// - Reps-based activities: 1 point per 2 reps, up to EFFORT_CAP.
// - Days-based (e.g. sleep consistency): 15 points per day, up to EFFORT_CAP.
// - Every accepted submission earns at least MIN_POINTS.
// - Photo + video evidence on a manual submission adds EVIDENCE_BONUS.
// - Camera-verified sessions pay DOUBLE effort points (min VERIFIED_MIN,
//   capped at VERIFIED_CAP) — proof is worth more than the honor system.

export const EFFORT_CAP = 60;
export const MIN_POINTS = 5;
export const EVIDENCE_BONUS = 10;
export const VERIFIED_MULTIPLIER = 2;
export const VERIFIED_MIN = 10;
export const VERIFIED_CAP = 100;

// Normalize a measurement unit string ("minutes", "Time", "reps", "days").
function normalizeUnit(unit: string | null | undefined): "minutes" | "reps" | "days" {
  const u = (unit || "").toString().trim().toLowerCase();
  if (u === "reps") return "reps";
  if (u === "days") return "days";
  return "minutes"; // "minutes", "time", and anything unknown are time-based
}

// Parse a quantity that may arrive as "45", "45 minutes", "30 reps", etc.
export function parseQuantity(quantity: string | number | null | undefined): number {
  if (typeof quantity === "number") return Number.isFinite(quantity) ? quantity : 0;
  const m = (quantity || "").toString().match(/-?\d+(\.\d+)?/);
  const n = m ? parseFloat(m[0]) : 0;
  return Number.isFinite(n) ? n : 0;
}

// Raw effort points for a quantity of work in the given unit (before the
// minimum floor). Exposed for previews that want the exact curve.
export function effortPoints(unit: string | null | undefined, quantity: string | number | null | undefined): number {
  const qty = Math.max(0, parseQuantity(quantity));
  switch (normalizeUnit(unit)) {
    case "reps":
      return Math.min(EFFORT_CAP, Math.ceil(qty / 2));
    case "days":
      return Math.min(EFFORT_CAP, Math.round(qty * 15));
    default:
      return Math.min(EFFORT_CAP, Math.round(qty));
  }
}

// Points for a normal (manual or Apple Health) activity submission.
export function activityPoints(
  unit: string | null | undefined,
  quantity: string | number | null | undefined,
  hasBothEvidenceTypes: boolean = false,
): number {
  const base = Math.max(MIN_POINTS, effortPoints(unit, quantity));
  return base + (hasBothEvidenceTypes ? EVIDENCE_BONUS : 0);
}

// Points for a completed camera-verified session.
export function verifiedSessionPoints(
  mode: "time" | "reps",
  amount: number, // minutes for time mode, reps for reps mode
): number {
  const base = effortPoints(mode === "reps" ? "reps" : "minutes", amount);
  return Math.min(VERIFIED_CAP, Math.max(VERIFIED_MIN, base * VERIFIED_MULTIPLIER));
}

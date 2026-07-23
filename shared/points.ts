// Effort-based activity points, shared by server (authoritative award) and
// client (previews / help copy). One place so numbers never drift.
//
// Scheme (owner's rule, 2026-07-23):
// - User points are awarded per minute or per rep, TIMES 2.
//   A 20-minute run earns 40 pts; 100 reps earn 200 pts (up to EFFORT_CAP).
// - Days-based (e.g. sleep consistency): 15 points per day.
// - Every accepted submission earns at least MIN_POINTS.
// - Evidence bonus: +PHOTO_BONUS with a photo, +VIDEO_BONUS with video
//   (video is the bigger bonus; they don't stack).
// - Camera-verified sessions pay DOUBLE effort points (min VERIFIED_MIN,
//   capped at VERIFIED_CAP) — proof is worth more than the honor system.

export const EFFORT_RATE = 2; // points per minute or per rep
export const EFFORT_CAP = 200;
export const MIN_POINTS = 5;
export const PHOTO_BONUS = 15;
export const VIDEO_BONUS = 30;
export const VERIFIED_MULTIPLIER = 2;
export const VERIFIED_MIN = 10;
export const VERIFIED_CAP = 300;

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
    case "days":
      return Math.min(EFFORT_CAP, Math.round(qty * 15));
    default: // minutes and reps both pay EFFORT_RATE per unit
      return Math.min(EFFORT_CAP, Math.round(qty * EFFORT_RATE));
  }
}

// Evidence bonus: video is worth the most; photo alone a smaller bonus.
export function evidenceBonus(hasImage: boolean, hasVideo: boolean): number {
  if (hasVideo) return VIDEO_BONUS;
  if (hasImage) return PHOTO_BONUS;
  return 0;
}

// Points for a normal (manual or Apple Health) activity submission.
export function activityPoints(
  unit: string | null | undefined,
  quantity: string | number | null | undefined,
  hasImage: boolean = false,
  hasVideo: boolean = false,
): number {
  const base = Math.max(MIN_POINTS, effortPoints(unit, quantity));
  return base + evidenceBonus(hasImage, hasVideo);
}

// Points for a completed camera-verified session.
export function verifiedSessionPoints(
  mode: "time" | "reps",
  amount: number, // minutes for time mode, reps for reps mode
): number {
  const base = effortPoints(mode === "reps" ? "reps" : "minutes", amount);
  return Math.min(VERIFIED_CAP, Math.max(VERIFIED_MIN, base * VERIFIED_MULTIPLIER));
}

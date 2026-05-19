export const PRICING_2_WEEK = { cents: 700, points: 1000, weeks: 2 } as const;
export const PRICING_4_WEEK = { cents: 1400, points: 2000, weeks: 4 } as const;

export type PricingTier = "short" | "long";

export interface CompetitionPricing {
  cents: number;
  dollars: number;
  points: number;
  weeks: number;
  tier: PricingTier;
}

type PricingInput = {
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  paymentType?: string | null;
  pricingTier?: string | null;
};

export function getCompetitionPricing(competition: PricingInput): CompetitionPricing | null {
  if (!competition) return null;
  if (competition.paymentType && competition.paymentType === "free") return null;

  // Prefer the admin-selected tier when present.
  if (competition.pricingTier === "short" || competition.pricingTier === "long") {
    const t = competition.pricingTier === "short" ? PRICING_2_WEEK : PRICING_4_WEEK;
    return {
      cents: t.cents,
      dollars: t.cents / 100,
      points: t.points,
      weeks: t.weeks,
      tier: competition.pricingTier,
    };
  }

  // Backward-compat: derive tier from duration for older comps that have no
  // pricingTier set. Anything <=17 days falls into the short bucket.
  if (!competition.startDate || !competition.endDate) return null;
  const start = new Date(competition.startDate).getTime();
  const end = new Date(competition.endDate).getTime();
  if (!isFinite(start) || !isFinite(end) || end <= start) return null;

  const days = Math.round((end - start) / 86400000);
  const tier: PricingTier = days <= 17 ? "short" : "long";
  const t = tier === "short" ? PRICING_2_WEEK : PRICING_4_WEEK;
  return { cents: t.cents, dollars: t.cents / 100, points: t.points, weeks: t.weeks, tier };
}

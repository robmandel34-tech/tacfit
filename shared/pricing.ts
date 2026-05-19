export const PRICING_2_WEEK = { cents: 700, points: 1000, weeks: 2 } as const;
export const PRICING_4_WEEK = { cents: 1400, points: 2000, weeks: 4 } as const;

export interface CompetitionPricing {
  cents: number;
  dollars: number;
  points: number;
  weeks: number;
}

type PricingInput = {
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  paymentType?: string | null;
};

export function getCompetitionPricing(competition: PricingInput): CompetitionPricing | null {
  if (!competition) return null;
  if (competition.paymentType && competition.paymentType === "free") return null;
  if (!competition.startDate || !competition.endDate) return null;

  const start = new Date(competition.startDate).getTime();
  const end = new Date(competition.endDate).getTime();
  if (!isFinite(start) || !isFinite(end) || end <= start) return null;

  const days = Math.round((end - start) / 86400000);
  const tier = days <= 17 ? PRICING_2_WEEK : PRICING_4_WEEK;
  return { cents: tier.cents, dollars: tier.cents / 100, points: tier.points, weeks: tier.weeks };
}

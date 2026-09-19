import { and, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import {
  competitionRecaps,
  competitionRecapUserStats,
  type Activity,
  type Competition,
  type CompetitionRecap,
  type CompetitionRecapSummary,
  type CompetitionRecapUserStats,
  type RecapActivityTotal,
  type RecapTeamStanding,
  type Team,
  type TeamMember,
} from "@shared/schema";
import { parseQuantity } from "@shared/points";

// Postgres text[] columns sometimes arrive as "{a,b}" strings depending on the
// driver path; normalise to a JS array.
function toStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    if (value === "{}") return [];
    if (value.startsWith("{") && value.endsWith("}")) {
      const inner = value.slice(1, -1);
      return inner ? inner.split(",").map((s) => s.replace(/^"|"$/g, "")) : [];
    }
  }
  return [];
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Mirrors the client-side progress-map math: per required activity, total
// quantity vs. the numeric target at the same index, averaged, capped at 100.
function teamProgressPercent(
  teamActivities: Activity[],
  requiredActivities: string[],
  targetGoals: string[],
): number {
  let total = 0;
  let counted = 0;
  requiredActivities.forEach((type, index) => {
    const targetNumber = parseInt((targetGoals[index] || "").replace(/[^0-9]/g, ""), 10) || 0;
    if (targetNumber <= 0) return;
    const quantity = teamActivities
      .filter((a) => a.type === type)
      .reduce((sum, a) => sum + parseQuantity(a.quantity), 0);
    total += Math.min((quantity / targetNumber) * 100, 100);
    counted++;
  });
  return counted > 0 ? Math.round(total / counted) : 0;
}

function hasEvidence(a: Activity): boolean {
  return !!a.evidenceUrl || (Array.isArray(a.imageUrls) && a.imageUrls.length > 0);
}

interface RankedTeam {
  team: Team;
  members: TeamMember[];
  activities: Activity[];
  points: number;
  progressPercent: number;
  rank: number;
}

export interface CompetitionRecapData {
  summary: CompetitionRecapSummary;
  rankedTeams: RankedTeam[];
  userStats: Array<{ userId: number; teamId: number | null; stats: CompetitionRecapUserStats }>;
}

// Pure computation: final standings + per-participant stats for a competition.
// Ranking is by valid points (activities logged for the team since the start
// date — the same numbers the standings page shows), progress % as tiebreaker.
export async function computeCompetitionRecap(competition: Competition): Promise<CompetitionRecapData> {
  const requiredActivities = toStringArray(competition.requiredActivities).map((s) => s.trim());
  const targetGoals = toStringArray(competition.targetGoals);
  const startDate = new Date(competition.startDate);
  const endDate = new Date(competition.endDate);
  // Activities count from the start date through the end of the final day.
  // End dates are stored at midnight, so a date-only end means "inclusive of
  // that whole day"; an end date with a time component is used as-is.
  const endBound = new Date(endDate);
  if (endBound.getUTCHours() === 0 && endBound.getUTCMinutes() === 0 && endBound.getUTCSeconds() === 0) {
    endBound.setUTCDate(endBound.getUTCDate() + 1);
  }

  const activityTypes = await storage.getActivityTypes();
  const typeMeta = new Map(
    activityTypes.map((t) => [t.name.toLowerCase(), { displayName: t.displayName, unit: t.measurementUnit }]),
  );
  const describeType = (type: string) => {
    const meta = typeMeta.get(type.toLowerCase());
    return {
      displayName: meta?.displayName || type.charAt(0).toUpperCase() + type.slice(1),
      unit: meta?.unit || "",
    };
  };

  const teams = await storage.getTeamsByCompetition(competition.id);
  const ranked: RankedTeam[] = [];
  for (const team of teams) {
    const members = await storage.getTeamMembers(team.id);
    const activities = (await storage.getActivitiesByTeam(team.id)).filter((a) => {
      if (!a.createdAt || a.isFlagged) return false;
      const at = new Date(a.createdAt);
      return at >= startDate && at < endBound;
    });
    const points = activities.reduce((sum, a) => sum + (a.points || 0), 0);
    ranked.push({
      team,
      members,
      activities,
      points,
      progressPercent: teamProgressPercent(activities, requiredActivities, targetGoals),
      rank: 0,
    });
  }
  ranked.sort((a, b) => b.points - a.points || b.progressPercent - a.progressPercent || a.team.id - b.team.id);
  ranked.forEach((r, i) => (r.rank = i + 1));

  const allActivities = ranked.flatMap((r) => r.activities);
  const participantIds = new Set<number>();
  ranked.forEach((r) => r.members.forEach((m) => m.userId && participantIds.add(m.userId)));

  const totalsByType = (activities: Activity[], types: string[] | null): RecapActivityTotal[] => {
    const buckets = new Map<string, { count: number; totalQuantity: number }>();
    for (const a of activities) {
      const key = a.type;
      const bucket = buckets.get(key) || { count: 0, totalQuantity: 0 };
      bucket.count++;
      bucket.totalQuantity += parseQuantity(a.quantity);
      buckets.set(key, bucket);
    }
    const keys = types && types.length > 0 ? types : Array.from(buckets.keys());
    const out: RecapActivityTotal[] = keys.map((type) => {
      const bucket = buckets.get(type) || { count: 0, totalQuantity: 0 };
      const idx = requiredActivities.indexOf(type);
      const target = idx >= 0 ? parseInt((targetGoals[idx] || "").replace(/[^0-9]/g, ""), 10) || null : null;
      const { displayName, unit } = describeType(type);
      return {
        type,
        displayName,
        unit,
        count: bucket.count,
        totalQuantity: Math.round(bucket.totalQuantity * 10) / 10,
        target,
      };
    });
    // Any activity types outside the required list still get listed after them.
    if (types && types.length > 0) {
      for (const [type, bucket] of Array.from(buckets.entries())) {
        if (types.includes(type)) continue;
        const { displayName, unit } = describeType(type);
        out.push({
          type,
          displayName,
          unit,
          count: bucket.count,
          totalQuantity: Math.round(bucket.totalQuantity * 10) / 10,
          target: null,
        });
      }
    }
    return out.sort((a, b) => b.count - a.count);
  };

  const standings: RecapTeamStanding[] = ranked.map((r) => ({
    teamId: r.team.id,
    name: r.team.name,
    rank: r.rank,
    points: r.points,
    progressPercent: r.progressPercent,
    memberCount: r.members.length,
    activityCount: r.activities.length,
  }));

  const winner = ranked[0]
    ? { teamId: ranked[0].team.id, name: ranked[0].team.name, points: ranked[0].points }
    : null;

  const summary: CompetitionRecapSummary = {
    competitionId: competition.id,
    name: competition.name,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    durationDays: Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000)),
    teamCount: ranked.length,
    participantCount: participantIds.size,
    activityCount: allActivities.length,
    totalPoints: allActivities.reduce((sum, a) => sum + (a.points || 0), 0),
    verifiedCount: allActivities.filter((a) => a.isVerified).length,
    evidenceCount: allActivities.filter(hasEvidence).length,
    winner,
    standings,
    activityTotals: totalsByType(allActivities, requiredActivities),
  };

  const userStats: CompetitionRecapData["userStats"] = [];
  for (const r of ranked) {
    // Rank members inside the team by points contributed.
    const memberPoints = r.members.map((m) => ({
      member: m,
      points: r.activities.filter((a) => a.userId === m.userId).reduce((s, a) => s + (a.points || 0), 0),
    }));
    memberPoints.sort((a, b) => b.points - a.points);

    for (const { member, points } of memberPoints) {
      if (!member.userId) continue;
      const user = await storage.getUser(member.userId);
      if (!user) continue;
      const mine = r.activities.filter((a) => a.userId === member.userId);
      const activeDays = new Set(mine.map((a) => dayKey(new Date(a.createdAt!)))).size;
      const stats: CompetitionRecapUserStats = {
        userId: user.id,
        username: user.username,
        teamId: r.team.id,
        teamName: r.team.name,
        teamRank: r.rank,
        teamPoints: r.points,
        activityCount: mine.length,
        points,
        verifiedCount: mine.filter((a) => a.isVerified).length,
        evidenceCount: mine.filter(hasEvidence).length,
        activeDays,
        teamContributionPercent: r.points > 0 ? Math.round((points / r.points) * 100) : 0,
        rankInTeam: memberPoints.findIndex((mp) => mp.member.userId === member.userId) + 1,
        byType: totalsByType(mine, null),
      };
      userStats.push({ userId: user.id, teamId: r.team.id, stats });
    }
  }

  return { summary, rankedTeams: ranked, userStats };
}

// Persists a computed recap. Idempotent: the unique competition_id constraint
// means a second call (e.g. two requests racing to complete the same
// competition) returns the existing recap instead of creating a duplicate.
export async function saveCompetitionRecap(data: CompetitionRecapData): Promise<CompetitionRecap> {
  const existing = await getCompetitionRecap(data.summary.competitionId);
  if (existing) return existing;

  return db.transaction(async (tx) => {
    const [recap] = await tx
      .insert(competitionRecaps)
      .values({ competitionId: data.summary.competitionId, summary: data.summary })
      .onConflictDoNothing({ target: competitionRecaps.competitionId })
      .returning();
    if (!recap) {
      const [again] = await tx
        .select()
        .from(competitionRecaps)
        .where(eq(competitionRecaps.competitionId, data.summary.competitionId));
      return again;
    }
    if (data.userStats.length > 0) {
      await tx
        .insert(competitionRecapUserStats)
        .values(
          data.userStats.map((u) => ({
            recapId: recap.id,
            competitionId: data.summary.competitionId,
            userId: u.userId,
            teamId: u.teamId,
            stats: u.stats,
          })),
        )
        .onConflictDoNothing();
    }
    return recap;
  });
}

export async function getCompetitionRecap(competitionId: number): Promise<CompetitionRecap | undefined> {
  const [recap] = await db.select().from(competitionRecaps).where(eq(competitionRecaps.competitionId, competitionId));
  return recap;
}

export async function getRecapUserStats(
  competitionId: number,
  userId: number,
): Promise<CompetitionRecapUserStats | undefined> {
  const [row] = await db
    .select()
    .from(competitionRecapUserStats)
    .where(and(eq(competitionRecapUserStats.competitionId, competitionId), eq(competitionRecapUserStats.userId, userId)));
  return row?.stats;
}

// Competition ids (from the given set) that already have a recap.
export async function competitionIdsWithRecap(competitionIds: number[]): Promise<Set<number>> {
  if (competitionIds.length === 0) return new Set();
  const rows = await db
    .select({ competitionId: competitionRecaps.competitionId })
    .from(competitionRecaps)
    .where(inArray(competitionRecaps.competitionId, competitionIds));
  return new Set(rows.map((r) => r.competitionId));
}

// Every recap, newest first, plus the competition ids the viewer took part in.
export async function listRecapsForViewer(viewerId: number): Promise<{
  recaps: CompetitionRecap[];
  participated: Set<number>;
}> {
  const recaps = await db.select().from(competitionRecaps);
  recaps.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const mine = await db
    .select({ competitionId: competitionRecapUserStats.competitionId })
    .from(competitionRecapUserStats)
    .where(eq(competitionRecapUserStats.userId, viewerId));
  return { recaps, participated: new Set(mine.map((m) => m.competitionId)) };
}

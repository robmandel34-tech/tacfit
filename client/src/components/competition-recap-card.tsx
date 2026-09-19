import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Flag, Users, Activity, Medal, ChevronRight } from "lucide-react";
import type { CompetitionRecapSummary } from "@shared/schema";

export interface CompetitionRecapFeedItem {
  id: number;
  competitionId: number;
  createdAt: string;
  summary: CompetitionRecapSummary;
  // True when the signed-in user took part, so they can open their own card.
  viewerParticipated: boolean;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function rankStyle(rank: number) {
  if (rank === 1) return "bg-combat-orange text-white border-combat-orange";
  if (rank === 2) return "bg-gray-300 text-gray-900 border-gray-300";
  if (rank === 3) return "bg-amber-700 text-white border-amber-700";
  return "bg-tactical-gray text-gray-200 border-gray-600";
}

// The one auto-post per finished competition: overall summary and final team
// standings. Individual stats live on the personal momento card instead.
export default function CompetitionRecapCard({ recap }: { recap: CompetitionRecapFeedItem }) {
  const [, setLocation] = useLocation();
  const { summary } = recap;
  const standings = [...summary.standings].sort((a, b) => a.rank - b.rank).slice(0, 5);
  const hiddenCount = summary.standings.length - standings.length;

  return (
    <Card className="tile-card border-combat-orange/40 overflow-hidden" data-testid={`card-competition-recap-${recap.competitionId}`}>
      <div className="bg-gradient-to-r from-combat-orange/25 via-transparent to-steel-blue/20 px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2 text-combat-orange text-xs font-semibold uppercase tracking-wider">
          <Flag className="h-3.5 w-3.5" />
          Competition complete
        </div>
        <h3 className="text-white text-xl font-bold mt-1">{summary.name}</h3>
        <p className="text-gray-400 text-sm">
          {formatDate(summary.startDate)} – {formatDate(summary.endDate)} · {summary.durationDays} day{summary.durationDays === 1 ? "" : "s"}
        </p>
      </div>

      <CardContent className="p-5 space-y-5">
        {summary.winner && (
          <div className="flex items-center gap-3 rounded-lg bg-combat-orange/10 border border-combat-orange/40 px-4 py-3">
            <Trophy className="h-6 w-6 text-combat-orange shrink-0" />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-combat-orange font-semibold">Winner</p>
              <p className="text-white font-bold truncate">{summary.winner.name}</p>
            </div>
            <span className="ml-auto text-combat-orange font-bold whitespace-nowrap">{summary.winner.points.toLocaleString()} pts</span>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-lg bg-surface-overlay py-3">
            <p className="text-white text-lg font-bold">{summary.teamCount}</p>
            <p className="text-gray-400 text-[11px] uppercase tracking-wide">Teams</p>
          </div>
          <div className="rounded-lg bg-surface-overlay py-3">
            <p className="text-white text-lg font-bold">{summary.participantCount}</p>
            <p className="text-gray-400 text-[11px] uppercase tracking-wide">Athletes</p>
          </div>
          <div className="rounded-lg bg-surface-overlay py-3">
            <p className="text-white text-lg font-bold">{summary.activityCount.toLocaleString()}</p>
            <p className="text-gray-400 text-[11px] uppercase tracking-wide">Activities</p>
          </div>
          <div className="rounded-lg bg-surface-overlay py-3">
            <p className="text-combat-orange text-lg font-bold">{summary.totalPoints.toLocaleString()}</p>
            <p className="text-gray-400 text-[11px] uppercase tracking-wide">Points</p>
          </div>
        </div>

        {standings.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-gray-300 text-sm font-semibold mb-2">
              <Medal className="h-4 w-4 text-steel-blue" />
              Final standings
            </div>
            <ul className="space-y-1.5">
              {standings.map((team) => (
                <li
                  key={team.teamId}
                  className="flex items-center gap-3 rounded-md bg-surface-overlay px-3 py-2"
                  data-testid={`row-recap-standing-${team.teamId}`}
                >
                  <Badge className={`w-8 justify-center px-0 ${rankStyle(team.rank)}`}>#{team.rank}</Badge>
                  <span className="text-white text-sm font-medium truncate flex-1">{team.name}</span>
                  <span className="text-gray-400 text-xs hidden sm:inline-flex items-center gap-1">
                    <Users className="h-3 w-3" /> {team.memberCount}
                  </span>
                  <span className="text-gray-400 text-xs hidden sm:inline-flex items-center gap-1">
                    <Activity className="h-3 w-3" /> {team.activityCount}
                  </span>
                  <span className="text-combat-orange text-sm font-semibold whitespace-nowrap">{team.points.toLocaleString()} pts</span>
                </li>
              ))}
            </ul>
            {hiddenCount > 0 && (
              <p className="text-gray-500 text-xs mt-2">+{hiddenCount} more team{hiddenCount === 1 ? "" : "s"}</p>
            )}
          </div>
        )}

        {recap.viewerParticipated && (
          <Button
            onClick={() => setLocation(`/competitions/${recap.competitionId}/card`)}
            className="w-full bg-military-green hover:bg-military-green/80 text-forest-green font-semibold"
            data-testid={`button-open-recap-card-${recap.competitionId}`}
          >
            View my momento card
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

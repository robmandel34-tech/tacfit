import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface Participation {
  user: { id: number; username: string; email: string } | undefined;
  totalActivities: number;
  totalPoints: number;
  lastActivityAt: string | null;
  activitiesInLast7Days: number;
  activitiesInLast14Days: number;
  moodLogsInLast7Days: number;
  currentTeam: { teamId: number; teamName: string; competitionId: number; competitionName: string; role: string } | null;
  recentActivities: Array<{ id: number; activityType: string; points: number; createdAt: string | null }>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number | null;
  username?: string;
}

export function UserParticipationModal({ open, onOpenChange, userId, username }: Props) {
  const [competitionIdInput, setCompetitionIdInput] = useState<string>("");
  const competitionId = competitionIdInput ? parseInt(competitionIdInput) : undefined;

  const { data, isLoading, error } = useQuery<Participation>({
    queryKey: ["/api/admin/users", userId, "participation", competitionId ?? "all"],
    queryFn: async () => {
      const url = competitionId
        ? `/api/admin/users/${userId}/participation?competitionId=${competitionId}`
        : `/api/admin/users/${userId}/participation`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load participation");
      return res.json();
    },
    enabled: open && userId !== null,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-tactical-gray border-tactical-gray-lighter max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Participation: {username || `User #${userId}`}</DialogTitle>
          <DialogDescription className="text-gray-400">
            Leave the competition field empty for lifetime stats, or enter a competition ID to scope the activity/points data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pb-2">
          <Label className="text-white text-sm">Competition ID (optional)</Label>
          <Input
            value={competitionIdInput}
            onChange={(e) => setCompetitionIdInput(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="e.g. 12"
            className="bg-tactical-gray-darker border-tactical-gray-lighter text-white max-w-[200px]"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
          </div>
        ) : error ? (
          <p className="text-red-400 text-sm">Failed to load participation.</p>
        ) : data ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label="Total Activities" value={data.totalActivities} />
              <Stat label="Total Points" value={data.totalPoints} />
              <Stat label="Last 7 days" value={data.activitiesInLast7Days} highlight={data.activitiesInLast7Days === 0} />
              <Stat label="Last 14 days" value={data.activitiesInLast14Days} highlight={data.activitiesInLast14Days === 0} />
            </div>
            <div className="text-sm text-gray-300 space-y-1">
              <p>Last activity: <span className="text-white">{data.lastActivityAt ? format(new Date(data.lastActivityAt), "MMM d, yyyy h:mm a") : "Never"}</span></p>
              <p>Mood logs (last 7d): <span className="text-white">{data.moodLogsInLast7Days}</span></p>
              {data.currentTeam ? (
                <p>
                  Current team: <span className="text-white">{data.currentTeam.teamName}</span>{" "}
                  <Badge variant="outline" className="ml-1 text-xs">{data.currentTeam.role}</Badge>
                  <span className="text-gray-400"> in {data.currentTeam.competitionName}</span>
                </p>
              ) : (
                <p className="text-gray-400">Not currently on a team</p>
              )}
            </div>
            {data.recentActivities.length > 0 ? (
              <div>
                <p className="text-xs uppercase text-gray-400 mb-1">Recent Activities</p>
                <ul className="space-y-1 max-h-60 overflow-y-auto text-sm">
                  {data.recentActivities.map((a) => (
                    <li key={a.id} className="flex justify-between text-gray-200 border-b border-tactical-gray-darker py-1">
                      <span>{a.activityType} (+{a.points})</span>
                      <span className="text-gray-500">{a.createdAt ? format(new Date(a.createdAt), "MMM d, h:mm a") : ""}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No activities logged{competitionId ? " for this competition" : ""}.</p>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`p-2 rounded bg-tactical-gray-darker border ${highlight ? 'border-red-500/60' : 'border-tactical-gray-lighter'}`}>
      <div className={`text-xl font-bold ${highlight ? 'text-red-400' : 'text-white'}`}>{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

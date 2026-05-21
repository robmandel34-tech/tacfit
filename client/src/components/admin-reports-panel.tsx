import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Flag, Eye, CheckCircle2, XCircle, UserMinus, Loader2 } from "lucide-react";
import { format } from "date-fns";

const REASON_LABELS: Record<string, string> = {
  no_activity: "No activity logged",
  low_activity: "Very low activity",
  no_response: "Not responding in chat",
  other: "Other",
};

interface Report {
  id: number;
  teamId: number;
  competitionId: number;
  reporterId: number;
  reportedUserId: number;
  reason: string;
  note: string | null;
  status: string;
  adminResponse: string | null;
  resolvedAt: string | null;
  createdAt: string | null;
  reporterUsername: string | null;
  reportedUsername: string | null;
  teamName: string | null;
  competitionName: string | null;
}

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

export function AdminReportsPanel() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [viewing, setViewing] = useState<Report | null>(null);
  const [adminResponse, setAdminResponse] = useState("");

  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ["/api/admin/teammate-reports", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/teammate-reports?status=${statusFilter}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load reports");
      return res.json();
    },
  });

  const { data: participation, isLoading: loadingPart } = useQuery<Participation>({
    queryKey: ["/api/admin/users", viewing?.reportedUserId, "participation", viewing?.competitionId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${viewing!.reportedUserId}/participation?competitionId=${viewing!.competitionId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load participation");
      return res.json();
    },
    enabled: !!viewing,
  });

  const updateReport = useMutation({
    mutationFn: async (vars: { id: number; status: string; adminResponse?: string }) => {
      return apiRequest("PATCH", `/api/admin/teammate-reports/${vars.id}`, {
        status: vars.status,
        adminResponse: vars.adminResponse,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/teammate-reports"] });
      toast({ title: "Report updated" });
      setViewing(null);
      setAdminResponse("");
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (vars: { teamId: number; userId: number }) => {
      return apiRequest("POST", `/api/admin/teams/${vars.teamId}/remove-member/${vars.userId}`);
    },
    onSuccess: () => {
      toast({ title: "Member removed from team" });
    },
    onError: (err: any) => {
      toast({ title: "Could not remove member", description: err.message, variant: "destructive" });
    },
  });

  const handleResolve = (status: 'dismissed' | 'action_taken' | 'removed') => {
    if (!viewing) return;
    if (status === 'removed') {
      removeMember.mutate({ teamId: viewing.teamId, userId: viewing.reportedUserId });
    }
    updateReport.mutate({ id: viewing.id, status, adminResponse: adminResponse || undefined });
  };

  return (
    <div className="space-y-4">
      <Card className="bg-tactical-gray border-tactical-gray-lighter">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Flag className="h-5 w-5 text-yellow-500" />
            Teammate Reports
          </CardTitle>
          <div className="flex gap-2">
            {(["pending", "dismissed", "action_taken", "removed"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? "default" : "ghost"}
                onClick={() => setStatusFilter(s)}
                className="text-xs"
              >
                {s.replace("_", " ")}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
            </div>
          ) : reports.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No reports with status "{statusFilter}"</p>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-tactical-gray-darker rounded border border-tactical-gray-lighter">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium">{r.reportedUsername}</span>
                      <Badge variant="outline" className="text-xs">{REASON_LABELS[r.reason] || r.reason}</Badge>
                      <Badge variant="secondary" className="text-xs">{r.teamName} / {r.competitionName}</Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Reported by {r.reporterUsername} · {r.createdAt ? format(new Date(r.createdAt), "MMM d, yyyy h:mm a") : ""}
                    </p>
                    {r.note && <p className="text-sm text-gray-300 mt-1 italic">"{r.note}"</p>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setViewing(r); setAdminResponse(r.adminResponse || ""); }}>
                    <Eye className="h-4 w-4 mr-1" /> Review
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewing} onOpenChange={(o) => { if (!o) { setViewing(null); setAdminResponse(""); } }}>
        <DialogContent className="sm:max-w-2xl bg-tactical-gray border-tactical-gray-lighter max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Review Report: {viewing?.reportedUsername}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Reason: <span className="text-white">{viewing && (REASON_LABELS[viewing.reason] || viewing.reason)}</span>
              {viewing?.note && <><br />Captain note: <span className="text-white italic">"{viewing.note}"</span></>}
            </DialogDescription>
          </DialogHeader>

          {loadingPart ? (
            <div className="flex items-center justify-center py-6 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading participation...
            </div>
          ) : participation ? (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat label="Activities (all)" value={participation.totalActivities} />
                <Stat label="Points (this comp)" value={participation.totalPoints} />
                <Stat label="Last 7 days" value={participation.activitiesInLast7Days} highlight={participation.activitiesInLast7Days === 0} />
                <Stat label="Last 14 days" value={participation.activitiesInLast14Days} highlight={participation.activitiesInLast14Days === 0} />
              </div>
              <div className="text-sm text-gray-300">
                Last activity: <span className="text-white">{participation.lastActivityAt ? format(new Date(participation.lastActivityAt), "MMM d, yyyy h:mm a") : "Never"}</span>
              </div>
              <div className="text-sm text-gray-300">
                Mood logs (last 7d): <span className="text-white">{participation.moodLogsInLast7Days}</span>
              </div>
              {participation.recentActivities.length > 0 && (
                <div>
                  <p className="text-xs uppercase text-gray-400 mb-1">Recent Activities</p>
                  <ul className="space-y-1 max-h-40 overflow-y-auto text-sm">
                    {participation.recentActivities.map((a) => (
                      <li key={a.id} className="flex justify-between text-gray-200">
                        <span>{a.activityType} (+{a.points})</span>
                        <span className="text-gray-500">{a.createdAt ? format(new Date(a.createdAt), "MMM d") : ""}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}

          {viewing?.status === 'pending' && (
            <div className="space-y-3 pt-2 border-t border-tactical-gray-lighter">
              <Textarea
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="Optional internal note about your decision..."
                rows={2}
                className="bg-tactical-gray-darker border-tactical-gray-lighter text-white"
              />
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={() => handleResolve('dismissed')} disabled={updateReport.isPending}>
                  <XCircle className="h-4 w-4 mr-1" /> Dismiss
                </Button>
                <Button variant="outline" onClick={() => handleResolve('action_taken')} disabled={updateReport.isPending}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Mark Action Taken
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm(`Remove ${viewing.reportedUsername} from team "${viewing.teamName}"?`)) {
                      handleResolve('removed');
                    }
                  }}
                  disabled={updateReport.isPending || removeMember.isPending}
                >
                  <UserMinus className="h-4 w-4 mr-1" /> Remove From Team
                </Button>
              </div>
            </div>
          )}
          {viewing && viewing.status !== 'pending' && (
            <div className="pt-2 border-t border-tactical-gray-lighter text-sm">
              <p className="text-gray-400">Status: <Badge>{viewing.status}</Badge></p>
              {viewing.adminResponse && <p className="text-gray-300 mt-1">Admin note: "{viewing.adminResponse}"</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
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

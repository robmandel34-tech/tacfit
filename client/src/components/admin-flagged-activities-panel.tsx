import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Flag, CheckCircle2, Trash2, Loader2, Image as ImageIcon, Video } from "lucide-react";
import { format } from "date-fns";

interface FlaggedActivity {
  id: number;
  type: string;
  description: string;
  quantity: string | null;
  evidenceUrl: string | null;
  thumbnailUrl: string | null;
  imageUrls: string[] | null;
  points: number | null;
  createdAt: string | null;
  submitter: { id: number; username: string; avatar?: string | null } | null;
  team: { id: number; name: string } | null;
  competition: { id: number; name: string } | null;
  flagCount: number;
  flaggers: Array<{ userId: number; username: string; flaggedAt: string | null }>;
}

export function AdminFlaggedActivitiesPanel() {
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState<FlaggedActivity | null>(null);

  const { data: items = [], isLoading } = useQuery<FlaggedActivity[]>({
    queryKey: ["/api/admin/flagged-activities"],
    queryFn: async () => {
      const res = await fetch("/api/admin/flagged-activities", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load flagged activities");
      return res.json();
    },
  });

  const dismissFlag = useMutation({
    mutationFn: async (activityId: number) =>
      apiRequest("POST", `/api/admin/activities/${activityId}/dismiss-flag`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flagged-activities"] });
      toast({ title: "Flag dismissed", description: "The activity stays, points kept." });
    },
    onError: (err: any) => toast({ title: "Failed to dismiss", description: err.message, variant: "destructive" }),
  });

  const removeActivity = useMutation({
    mutationFn: async (activityId: number) => apiRequest("DELETE", `/api/activities/${activityId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/flagged-activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({ title: "Activity removed", description: "Points have been revoked." });
      setConfirmDelete(null);
    },
    onError: (err: any) => toast({ title: "Failed to remove", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-red-500" />
            Flagged Activities
            {items.length > 0 && (
              <Badge variant="destructive" className="ml-2">{items.length}</Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Activities other users have flagged as suspicious. Review the evidence —
            only remove if it's clearly fake (AI-generated, downloaded from the internet,
            or someone else's workout). Honest effort should stay.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-500" />
              No flagged activities. All clear.
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((a) => (
                <Card key={a.id} className="border-red-500/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="font-semibold">
                          {a.submitter?.username || "Unknown user"}{" "}
                          <span className="text-muted-foreground font-normal">— {a.type}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {a.team?.name && <>Team: <strong>{a.team.name}</strong> · </>}
                          {a.competition?.name && <>Competition: <strong>{a.competition.name}</strong> · </>}
                          {a.points != null && <>{a.points} pts · </>}
                          {a.createdAt && format(new Date(a.createdAt), "MMM d, yyyy h:mm a")}
                        </div>
                      </div>
                      <Badge variant="destructive">
                        <Flag className="h-3 w-3 mr-1" />
                        {a.flagCount} flag{a.flagCount === 1 ? "" : "s"}
                      </Badge>
                    </div>

                    {a.description && (
                      <p className="text-sm">{a.description}{a.quantity ? ` (${a.quantity})` : ""}</p>
                    )}

                    {/* Evidence preview */}
                    <div className="flex flex-wrap gap-2">
                      {(a.imageUrls || []).map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                          <img
                            src={url}
                            alt={`evidence ${i + 1}`}
                            className="h-32 w-32 object-cover rounded border border-border"
                          />
                        </a>
                      ))}
                      {a.evidenceUrl && (
                        <a href={a.evidenceUrl} target="_blank" rel="noopener noreferrer" className="block relative">
                          {a.thumbnailUrl ? (
                            <img src={a.thumbnailUrl} alt="video" className="h-32 w-32 object-cover rounded border border-border" />
                          ) : (
                            <div className="h-32 w-32 rounded border border-border flex items-center justify-center bg-muted">
                              <Video className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <Video className="h-5 w-5 absolute top-2 right-2 text-white drop-shadow" />
                        </a>
                      )}
                      {!a.evidenceUrl && (!a.imageUrls || a.imageUrls.length === 0) && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <ImageIcon className="h-4 w-4" />
                          No evidence attached
                        </div>
                      )}
                    </div>

                    {/* Flaggers */}
                    {a.flaggers.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Flagged by: {a.flaggers.map((f) => f.username).join(", ")}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => dismissFlag.mutate(a.id)}
                        disabled={dismissFlag.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Dismiss flag (keep activity)
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirmDelete(a)}
                        disabled={removeActivity.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remove activity & revoke points
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this activity?</DialogTitle>
            <DialogDescription>
              This deletes the submission and revokes the{" "}
              <strong>{confirmDelete?.points ?? 0}</strong> points from{" "}
              <strong>{confirmDelete?.submitter?.username}</strong>
              {confirmDelete?.team?.name ? <> and their team <strong>{confirmDelete.team.name}</strong></> : null}.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && removeActivity.mutate(confirmDelete.id)}
              disabled={removeActivity.isPending}
            >
              {removeActivity.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Remove activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

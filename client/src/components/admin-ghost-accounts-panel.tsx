import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Ghost, Loader2, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GhostAvatar, useGhostAccounts, type GhostAccount } from "@/components/ghost-switcher";
import { format } from "date-fns";

// apiRequest throws "<status>: <body>"; show the server's message only.
const serverMessage = (err: any, fallback: string) => {
  const raw = String(err?.message ?? "");
  const body = raw.replace(/^\d{3}:\s*/, "");
  try {
    return JSON.parse(body).message || fallback;
  } catch {
    return body || fallback;
  }
};

export function AdminGhostAccountsPanel() {
  const { toast } = useToast();
  const { actAsGhost } = useAuth();
  const { data: ghosts = [], isLoading } = useGhostAccounts();
  const [username, setUsername] = useState("");
  const [motto, setMotto] = useState("");
  const [switchingId, setSwitchingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<GhostAccount | null>(null);

  const createGhost = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ghosts", { username: username.trim(), motto: motto.trim() || undefined });
      return res.json() as Promise<GhostAccount>;
    },
    onSuccess: (ghost) => {
      setUsername("");
      setMotto("");
      queryClient.invalidateQueries({ queryKey: ["/api/ghosts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"], exact: true });
      toast({ title: "Ghost created", description: `${ghost.username} is ready. Use "Act as" to set up their profile and start posting.` });
    },
    onError: (err: any) => toast({ title: "Couldn't create ghost", description: serverMessage(err, "Please try again."), variant: "destructive" }),
  });

  const deleteGhost = useMutation({
    mutationFn: async (ghost: GhostAccount) => apiRequest("DELETE", `/api/users/${ghost.id}`),
    onSuccess: (_res, ghost) => {
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/ghosts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"], exact: true });
      toast({ title: "Ghost deleted", description: `${ghost.username} and everything they posted is gone.` });
    },
    onError: (err: any) => toast({ title: "Couldn't delete", description: serverMessage(err, "Please try again."), variant: "destructive" }),
  });

  const handleActAs = async (ghost: GhostAccount) => {
    setSwitchingId(ghost.id);
    try {
      await actAsGhost(ghost.id);
    } catch (e: any) {
      setSwitchingId(null);
      toast({ title: "Couldn't switch", description: e?.message || "Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Ghost Accounts</h2>
        <p className="text-gray-400 text-sm mt-1">
          Regular-looking members that only you can operate. Nobody can log into them directly — you switch into one
          from your own account, and a bar at the bottom of the screen reminds you who you're posting as.
        </p>
      </div>

      <Card className="bg-tactical-gray-lighter border-tactical-gray">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-military-green" />
            New ghost
          </CardTitle>
          <CardDescription className="text-gray-400">
            Pick the name other members will see. Photo, motto and everything else can be set from the ghost's own
            profile page after you switch into it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (!createGhost.isPending) createGhost.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="ghost-username" className="text-gray-300">Username</Label>
              <Input
                id="ghost-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Danny Ortiz"
                maxLength={30}
                className="bg-tactical-gray border-tactical-gray text-white"
                data-testid="input-ghost-username"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ghost-motto" className="text-gray-300">Motto (optional)</Label>
              <Input
                id="ghost-motto"
                value={motto}
                onChange={(e) => setMotto(e.target.value)}
                placeholder="Shows on their profile"
                maxLength={120}
                className="bg-tactical-gray border-tactical-gray text-white"
                data-testid="input-ghost-motto"
              />
            </div>
            <Button
              type="submit"
              disabled={username.trim().length < 2 || createGhost.isPending}
              className="bg-military-green hover:bg-military-green/80 text-white"
              data-testid="button-create-ghost"
            >
              {createGhost.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ghost className="h-4 w-4 mr-2" />}
              Create
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-tactical-gray-lighter border-tactical-gray">
        <CardHeader>
          <CardTitle className="text-white text-lg">Your ghosts ({ghosts.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <p className="text-sm text-gray-400">Loading…</p>}
          {!isLoading && ghosts.length === 0 && (
            <p className="text-sm text-gray-400" data-testid="text-no-ghosts">No ghost accounts yet.</p>
          )}
          {ghosts.map((ghost) => (
            <div
              key={ghost.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-tactical-gray bg-tactical-gray/60 p-3"
              data-testid={`row-admin-ghost-${ghost.id}`}
            >
              <GhostAvatar ghost={ghost} size="w-10 h-10" />
              <div className="min-w-0 flex-1">
                <p className="text-white font-medium truncate">{ghost.username}</p>
                <p className="text-xs text-gray-400 truncate">
                  {ghost.points} pts
                  {ghost.motto ? ` · ${ghost.motto}` : ""}
                  {ghost.createdAt ? ` · created ${format(new Date(ghost.createdAt), "MMM d, yyyy")}` : ""}
                  {ghost.isSuspended ? " · suspended" : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleActAs(ghost)}
                  disabled={switchingId !== null || ghost.isSuspended}
                  className="bg-military-green hover:bg-military-green/80 text-white"
                  data-testid={`button-admin-act-as-${ghost.id}`}
                >
                  {switchingId === ghost.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Ghost className="h-4 w-4 mr-1" />}
                  Act as
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDelete(ghost)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  aria-label={`Delete ${ghost.username}`}
                  data-testid={`button-admin-delete-ghost-${ghost.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && !deleteGhost.isPending && setConfirmDelete(null)}>
        <DialogContent className="bg-tactical-gray-dark border-tactical-gray text-white max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {confirmDelete?.username}?</DialogTitle>
            <DialogDescription className="text-gray-400">
              This permanently removes the ghost and every activity, comment and team membership it has. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={deleteGhost.isPending} className="border-tactical-gray text-gray-200">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDelete && deleteGhost.mutate(confirmDelete)}
              disabled={deleteGhost.isPending}
              data-testid="button-confirm-delete-ghost"
            >
              {deleteGhost.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

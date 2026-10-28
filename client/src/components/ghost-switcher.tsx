import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ghost, Loader2, Undo2, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { buildAuthHeaders, uploadUrl, API_BASE } from "@/lib/queryClient";

export interface GhostAccount {
  id: number;
  username: string;
  avatar?: string | null;
  motto?: string | null;
  points: number;
  isSuspended: boolean;
  createdAt?: string | null;
}

// Ghost lists must never be served from the Infinity-stale default cache: the
// admin creates one and expects to switch to it immediately.
export function useGhostAccounts(enabled = true) {
  return useQuery<GhostAccount[]>({
    queryKey: ["/api/ghosts"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/ghosts`, {
        credentials: "include",
        headers: await buildAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load ghost accounts");
      return res.json();
    },
    enabled,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function GhostAvatar({ ghost, size = "w-9 h-9" }: { ghost: Pick<GhostAccount, "username" | "avatar">; size?: string }) {
  if (ghost.avatar) {
    return <img src={uploadUrl(ghost.avatar)} alt="" className={`${size} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${size} rounded-full bg-tactical-gray border border-military-green/40 flex items-center justify-center flex-shrink-0`}>
      <span className="text-sm font-semibold text-military-green-light">{ghost.username.charAt(0).toUpperCase()}</span>
    </div>
  );
}

/**
 * Pick a ghost account to act as (or return to your own account). Opened from
 * the hamburger menu and the acting-as bar; the Admin Panel has the full
 * create/manage view.
 */
export function GhostSwitcherDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user, actAsGhost, returnToSelf } = useAuth();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<number | "return" | null>(null);
  const { data: ghosts = [], isLoading, isError } = useGhostAccounts(open);

  const acting = user?.actingAs ?? null;

  const switchTo = async (ghost: GhostAccount) => {
    setBusyId(ghost.id);
    try {
      await actAsGhost(ghost.id);
    } catch (e: any) {
      setBusyId(null);
      toast({ title: "Couldn't switch", description: e?.message || "Please try again.", variant: "destructive" });
    }
  };

  const goBack = async () => {
    setBusyId("return");
    try {
      await returnToSelf();
    } catch (e: any) {
      setBusyId(null);
      toast({ title: "Couldn't switch back", description: e?.message || "Please try again.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busyId && onOpenChange(next)}>
      <DialogContent className="bg-tactical-gray-dark border-tactical-gray text-white max-w-sm" data-testid="dialog-ghost-switcher">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ghost className="h-5 w-5 text-military-green" />
            Ghost accounts
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {acting
              ? <>You're currently posting as <span className="text-white font-medium">{user?.username}</span>.</>
              : "Pick an account to post and compete as. Everyone else sees it as a regular member."}
          </DialogDescription>
        </DialogHeader>

        {acting && (
          <Button
            onClick={goBack}
            disabled={busyId !== null}
            className="w-full bg-military-green hover:bg-military-green/80 text-white"
            data-testid="button-ghost-return"
          >
            {busyId === "return" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Undo2 className="h-4 w-4 mr-2" />}
            Back to {acting.actorUsername}
          </Button>
        )}

        <div className="max-h-80 overflow-y-auto -mx-1 px-1 space-y-2">
          {isLoading && <p className="text-sm text-gray-400 py-4 text-center">Loading…</p>}
          {isError && <p className="text-sm text-red-400 py-4 text-center">Couldn't load ghost accounts.</p>}
          {!isLoading && !isError && ghosts.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">
              No ghost accounts yet. Create one in Admin Panel → Ghosts.
            </p>
          )}
          {ghosts.map((ghost) => {
            const isCurrent = user?.id === ghost.id;
            return (
              <div
                key={ghost.id}
                className="flex items-center gap-3 rounded-lg border border-tactical-gray bg-tactical-gray-lighter/40 p-2.5"
                data-testid={`row-ghost-${ghost.id}`}
              >
                <GhostAvatar ghost={ghost} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{ghost.username}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {ghost.isSuspended ? "Suspended" : `${ghost.points} pts${ghost.motto ? ` · ${ghost.motto}` : ""}`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isCurrent ? "secondary" : "outline"}
                  disabled={isCurrent || ghost.isSuspended || busyId !== null}
                  onClick={() => switchTo(ghost)}
                  className={isCurrent ? "" : "border-military-green/60 text-military-green-light hover:bg-military-green/20"}
                  data-testid={`button-act-as-${ghost.id}`}
                >
                  {busyId === ghost.id ? <Loader2 className="h-4 w-4 animate-spin" /> : isCurrent ? "Current" : "Act as"}
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Persistent reminder while an admin is acting as a ghost. Sits just above the
 * bottom navigation on phones (below the floating submit button) and at the
 * bottom edge on desktop, so no page layout has to know about it.
 */
export function ActingAsBar() {
  const { user, returnToSelf } = useAuth();
  const { toast } = useToast();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [returning, setReturning] = useState(false);

  if (!user?.actingAs) return null;

  const goBack = async () => {
    setReturning(true);
    try {
      await returnToSelf();
    } catch (e: any) {
      setReturning(false);
      toast({ title: "Couldn't switch back", description: e?.message || "Please try again.", variant: "destructive" });
    }
  };

  return (
    <>
      <div
        className="fixed left-0 right-0 bottom-16 md:bottom-0 z-40 border-t border-amber-500/40 bg-amber-950/95 backdrop-blur-sm text-amber-100 shadow-2xl"
        data-testid="bar-acting-as"
      >
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2 text-xs sm:text-sm">
          <Ghost className="h-4 w-4 shrink-0 text-amber-300" />
          <p className="min-w-0 flex-1 truncate">
            Posting as <span className="font-semibold text-white">{user.username}</span>
            <span className="hidden sm:inline"> — everyone sees this as a regular member</span>
          </p>
          <button
            type="button"
            onClick={() => setSwitcherOpen(true)}
            aria-label="Switch ghost account"
            title="Switch ghost account"
            className="inline-flex items-center gap-1 rounded-md border border-amber-400/40 px-2 py-1 text-amber-100 hover:bg-amber-400/10"
            data-testid="button-acting-switch"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Switch</span>
          </button>
          <button
            type="button"
            onClick={goBack}
            disabled={returning}
            className="inline-flex items-center gap-1 rounded-md bg-amber-400 px-2 py-1 font-semibold text-amber-950 hover:bg-amber-300 disabled:opacity-60"
            data-testid="button-acting-return"
          >
            {returning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
            Back to {user.actingAs.actorUsername}
          </button>
        </div>
      </div>
      <GhostSwitcherDialog open={switcherOpen} onOpenChange={setSwitcherOpen} />
    </>
  );
}

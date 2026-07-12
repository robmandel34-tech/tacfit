import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { Video, CalendarClock, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TeamCall, ActiveCallParticipant } from "@shared/schema";

function LiveParticipants({ callId }: { callId: number }) {
  // Refreshes every 15s so the Team tab stays close to live without hammering
  // the server. Anyone whose heartbeat goes silent drops off automatically.
  const { data: participants = [] } = useQuery<ActiveCallParticipant[]>({
    queryKey: [`/api/calls/${callId}/participants`],
    refetchInterval: 15_000,
  });

  if (participants.length === 0) return null;

  return (
    <p
      className="mt-1 flex items-center gap-1.5 text-xs text-green-400"
      data-testid={`text-call-participants-${callId}`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      <span className="truncate">
        In the call now: {participants.map((p) => p.username).join(", ")}
      </span>
    </p>
  );
}

interface TeamCallsCardProps {
  teamId?: number;
  userId?: number;
  isCaptain?: boolean;
}

function defaultDateTimeLocal(): string {
  // Default to the next hour, rounded, in the user's local time.
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TeamCallsCard({ teamId, userId, isCaptain }: TeamCallsCardProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState(defaultDateTimeLocal());

  const { data: calls = [], isLoading } = useQuery<TeamCall[]>({
    queryKey: [`/api/teams/${teamId}/calls`],
    enabled: !!teamId,
  });

  const upcoming = calls
    .filter((c) => c.status !== "cancelled")
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      const scheduledFor = new Date(when);
      if (isNaN(scheduledFor.getTime())) {
        throw new Error("Please pick a valid date and time");
      }
      const res = await apiRequest("POST", `/api/teams/${teamId}/calls`, {
        title: title.trim(),
        scheduledFor: scheduledFor.toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/teams/${teamId}/calls`] });
      setIsDialogOpen(false);
      setTitle("");
      setWhen(defaultDateTimeLocal());
      toast({ title: "Call scheduled", description: "Your teammates can see it now." });
    },
    onError: (err: any) => {
      toast({
        title: "Could not schedule",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (callId: number) => {
      await apiRequest("PATCH", `/api/teams/${teamId}/calls/${callId}`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/teams/${teamId}/calls`] });
      toast({ title: "Call cancelled" });
    },
    onError: (err: any) => {
      toast({
        title: "Could not cancel",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!teamId) return null;

  return (
    <Card className="mb-6 tile-card" data-testid="card-team-calls">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-green-400" />
            Upcoming Calls
          </CardTitle>
          <Button
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            data-testid="button-schedule-call"
            className="bg-green-700 hover:bg-green-600"
          >
            <Plus className="h-4 w-4 mr-1" />
            Schedule
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-gray-400 text-sm">Loading calls...</p>
        ) : upcoming.length === 0 ? (
          <p className="text-gray-400 text-sm" data-testid="text-no-calls">
            No calls scheduled yet. Tap Schedule to set up a team call.
          </p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((call) => {
              const start = new Date(call.scheduledFor);
              const past = isPast(start);
              const canCancel = isCaptain || call.createdBy === userId;
              return (
                <li
                  key={call.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 p-3"
                  data-testid={`row-call-${call.id}`}
                >
                  <div className="min-w-0">
                    <p className="text-white font-semibold truncate">{call.title}</p>
                    <p className="text-gray-400 text-xs">
                      {format(start, "EEE, MMM d 'at' h:mm a")}
                      {" \u2022 "}
                      {past ? "in progress / started" : `in ${formatDistanceToNow(start)}`}
                    </p>
                    <LiveParticipants callId={call.id} />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => navigate(`/call/${call.id}`)}
                      data-testid={`button-join-call-${call.id}`}
                      className="bg-green-700 hover:bg-green-600"
                    >
                      <Video className="h-4 w-4 mr-1" />
                      Join
                    </Button>
                    {canCancel && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => cancelMutation.mutate(call.id)}
                        disabled={cancelMutation.isPending}
                        data-testid={`button-cancel-call-${call.id}`}
                        aria-label="Cancel call"
                        className="text-gray-400 hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="dialog-schedule-call">
          <DialogHeader>
            <DialogTitle>Schedule a team call</DialogTitle>
            <DialogDescription>
              Pick a name and time. Everyone on your team will see it and can join with one tap.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="call-title">Call name</Label>
              <Input
                id="call-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Weekly team huddle"
                maxLength={120}
                data-testid="input-call-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="call-when">Date and time</Label>
              <Input
                id="call-when"
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                data-testid="input-call-when"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => scheduleMutation.mutate()}
              disabled={scheduleMutation.isPending || !title.trim() || !when}
              data-testid="button-confirm-schedule"
              className="bg-green-700 hover:bg-green-600"
            >
              {scheduleMutation.isPending ? "Scheduling..." : "Schedule call"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useAuthRequired } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/navigation";
import CompetitionCard from "@/components/competition-card";
import InviteBuddiesModal from "@/components/invite-friends-modal";
import TeamSelectionModal from "@/components/team-selection-modal";
import CompetitionPaymentModal from "@/components/competition-payment-modal";
import FindFriendsModal from "@/components/find-friends-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Trophy, Users, Mail, Check, X, SlidersHorizontal, ChevronDown, Sparkles } from "lucide-react";
import { isActivityAllowed } from "@shared/healthkit";

// Normalise a competition's requiredActivities (array or "{a,b}" string) to names.
function requiredActivityNames(competition: any): string[] {
  const raw = competition?.requiredActivities;
  if (Array.isArray(raw)) return raw.map((v: any) => String(v).trim()).filter(Boolean);
  if (typeof raw === "string" && raw.startsWith("{") && raw.endsWith("}")) {
    return raw.slice(1, -1).split(",").map((v) => v.replace(/^"|"$/g, "").trim()).filter(Boolean);
  }
  return [];
}

// How many of the picked activities this competition accepts (umbrella-aware:
// picking "run" matches a competition that requires "cardio"). A competition
// with no required list accepts everything, so every pick counts.
function activityMatchCount(competition: any, picked: string[]): number {
  if (picked.length === 0) return 0;
  const required = requiredActivityNames(competition);
  if (required.length === 0) return picked.length;
  return picked.filter((activity) => isActivityAllowed(activity, required)).length;
}

export default function Competitions() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuthRequired();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [teamSelectionModalOpen, setTeamSelectionModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [findFriendsModalOpen, setFindFriendsModalOpen] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<{ id: number; name: string; description?: string } | null>(null);
  // Activity filter: the activities the user wants to do; competitions that
  // accept more of them float to the top.
  const [pickedActivities, setPickedActivities] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: activityTypes = [] } = useQuery<any[]>({
    queryKey: ["/api/activity-types"],
    enabled: !!user,
  });
  const activityDisplayName = (name: string) => {
    const match = activityTypes.find((t: any) => String(t.name).toLowerCase() === name.toLowerCase());
    return match?.displayName || name.charAt(0).toUpperCase() + name.slice(1);
  };

  // Fetch user's competition results for completed competitions
  const { data: userResults } = useQuery({
    queryKey: ["/api/users", user?.id, "competition-results"],
    enabled: !!user,
  });

  const { data: competitions = [] } = useQuery({
    queryKey: ["/api/competitions"],
    enabled: !!user,
    select: (data: any[]) => {
      // Get current date in user's local timezone for comparison
      const now = new Date();
      
      // Add computed join window status to each competition
      const enrichedCompetitions = data.map(comp => {
        let joinWindowStatus = 'unknown';
        let canJoin = comp.isActive && !comp.isCompleted;
        
        // If competition is completed, it should not be joinable
        if (comp.isCompleted) {
          joinWindowStatus = 'closed';
          canJoin = false;
        } else if (comp.joinStartDate && comp.joinEndDate) {
          // Parse the dates and work entirely in UTC to avoid timezone shifts
          const joinStart = new Date(comp.joinStartDate);
          const joinEnd = new Date(comp.joinEndDate);
          
          // Set join start to beginning of day UTC
          const joinStartUTC = new Date(joinStart);
          joinStartUTC.setUTCHours(0, 0, 0, 0);
          
          // Set join end to end of day UTC
          const joinEndUTC = new Date(joinEnd);
          joinEndUTC.setUTCHours(23, 59, 59, 999);
          
          if (now < joinStartUTC) {
            joinWindowStatus = 'not-opened';
            canJoin = false;
          } else if (now > joinEndUTC) {
            joinWindowStatus = 'closed';
            canJoin = false;
          } else {
            joinWindowStatus = 'open';
            canJoin = comp.isActive && !comp.isCompleted;
          }
        } else if (comp.isActive && !comp.isCompleted) {
          joinWindowStatus = 'open';
          canJoin = true;
        }
        
        return {
          ...comp,
          joinWindowStatus,
          canJoin
        };
      });
      
      // Don't filter out completed competitions - user needs to see results
      const availableCompetitions = enrichedCompetitions;
      
      // Sort competitions: joinable first, then by join window status, then by start date
      return availableCompetitions.sort((a, b) => {
        // First sort by joinability (joinable competitions first)
        if (a.canJoin && !b.canJoin) return -1;
        if (!a.canJoin && b.canJoin) return 1;
        
        // Then sort by join window status priority
        const statusPriority: { [key: string]: number } = { 'open': 0, 'not-opened': 1, 'unknown': 3 };
        const aPriority = statusPriority[a.joinWindowStatus] || 3;
        const bPriority = statusPriority[b.joinWindowStatus] || 3;
        
        if (aPriority !== bPriority) return aPriority - bPriority;
        
        // Then sort by start date (newer competitions first within each group)
        const dateA = new Date(a.startDate).getTime();
        const dateB = new Date(b.startDate).getTime();
        return dateB - dateA;
      });
    }
  });

  // Every activity required by an open (not yet completed) competition. When
  // no open competition declares any (e.g. all are finished), fall back to the
  // full activity list so the filter is always there to find.
  const { openActivities, filterFromOpenCompetitions } = useMemo(() => {
    const names = new Map<string, string>();
    for (const comp of competitions as any[]) {
      if (comp.isCompleted) continue;
      for (const name of requiredActivityNames(comp)) {
        names.set(name.toLowerCase(), name);
      }
    }
    const fromOpen = names.size > 0;
    if (!fromOpen) {
      for (const type of activityTypes) {
        const name = String(type?.name ?? "").trim();
        if (name) names.set(name.toLowerCase(), name);
      }
    }
    const sorted = Array.from(names.values()).sort((a, b) => activityDisplayName(a).localeCompare(activityDisplayName(b)));
    return { openActivities: sorted, filterFromOpenCompetitions: fromOpen };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitions, activityTypes]);

  // Re-rank when activities are picked: joinable first (unchanged), then by how
  // many picks the competition accepts, then how focused the fit is.
  const rankedCompetitions = useMemo(() => {
    if (pickedActivities.length === 0) return competitions as any[];
    return [...(competitions as any[])]
      .map((comp, index) => {
        const matches = activityMatchCount(comp, pickedActivities);
        const required = requiredActivityNames(comp).length;
        return { comp, index, matches, focus: required > 0 ? matches / required : 0 };
      })
      .sort((a, b) => {
        if (a.comp.canJoin !== b.comp.canJoin) return a.comp.canJoin ? -1 : 1;
        if (a.matches !== b.matches) return b.matches - a.matches;
        if (a.focus !== b.focus) return b.focus - a.focus;
        return a.index - b.index;
      })
      .map((entry) => entry.comp);
  }, [competitions, pickedActivities]);

  const togglePickedActivity = (name: string) => {
    setPickedActivities((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  // Fetch pending team invitations for this user.
  // The global TanStack defaults are staleTime: Infinity + refetchOnWindowFocus: false,
  // which means without these overrides a freshly-sent invite would never show up
  // on the invitee's device until they fully kill and relaunch the app. We poll
  // every 20s, refetch on mount, and refetch when the window/app regains focus.
  const { data: teamInvitations = [] } = useQuery<any[]>({
    queryKey: ["/api/users", user?.id, "team-invitations"],
    // apiRequest attaches the bearer token the native app relies on; this
    // endpoint only returns invitations to the signed-in user.
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/users/${user?.id}/team-invitations`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: 20000,
  });

  // When a paid invitation needs payment first, we stash the invitation here
  // so the payment-success callback can finish the join into the inviter's team.
  const [pendingInvitation, setPendingInvitation] = useState<{ invitationId: number; teamId: number } | null>(null);
  // Set right after a successful payment so we can warn the user if they
  // close the team-selection modal without picking a team.
  const [justPaidEntry, setJustPaidEntry] = useState(false);

  const acceptInvitation = useMutation({
    mutationFn: async (invitationId: number) => {
      const res = await apiRequest("POST", `/api/team-invitations/${invitationId}/accept`, { userId: user?.id });
      return res.json();
    },
    onSuccess: (data: any, invitationId: number) => {
      // Paid competition — open the payment modal; the join is finished only after payment succeeds.
      if (data?.requiresPayment && data?.competition) {
        setSelectedCompetition({
          id: data.competition.id,
          name: data.competition.name,
          description: data.competition.description,
          startDate: data.competition.startDate,
          endDate: data.competition.endDate,
          paymentType: data.competition.paymentType,
        } as any);
        setPendingInvitation({ invitationId, teamId: data.teamId });
        setPaymentModalOpen(true);
        return;
      }

      // Free competition — server already added the user to the team.
      // Match all keys starting with /api/team-members or /api/teams, regardless
      // of the trailing template string form used by individual pages.
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "team-invitations"] });
      queryClient.invalidateQueries({
        predicate: (q) => {
          const k = String(q.queryKey[0] ?? "");
          return k.startsWith("/api/team-members") || k.startsWith("/api/teams") || k.startsWith("/api/competitions");
        },
      });
      toast({ title: "Joined!", description: "You've joined the team. Head to Team to see your squad." });
    },
    onError: () => toast({ title: "Error", description: "Could not accept the invitation.", variant: "destructive" }),
  });

  // After payment succeeds for an invited paid competition, finish the join
  // by adding the user to the inviter's team and marking the invite accepted.
  const completeInvitationAfterPayment = useMutation({
    mutationFn: async (invitationId: number) => {
      const res = await apiRequest("POST", `/api/team-invitations/${invitationId}/complete-after-payment`, { userId: user?.id });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "team-invitations"] });
      queryClient.invalidateQueries({
        predicate: (q) => {
          const k = String(q.queryKey[0] ?? "");
          return k.startsWith("/api/team-members") || k.startsWith("/api/teams") || k.startsWith("/api/competitions");
        },
      });
      toast({ title: "You're in!", description: "Payment received and you've joined the team." });
      setPendingInvitation(null);
    },
    onError: (err: any) => {
      toast({ title: "Almost there", description: err?.message || "Payment went through but joining the team failed — contact support.", variant: "destructive" });
    },
  });

  const declineInvitation = useMutation({
    mutationFn: async (invitationId: number) => {
      const res = await apiRequest("POST", `/api/team-invitations/${invitationId}/decline`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "team-invitations"] });
      toast({ title: "Declined", description: "Invitation declined." });
    },
  });

  // Remove the old automatic joining logic

  const handleInvite = (competitionId: number, competitionName: string) => {
    setSelectedCompetition({ id: competitionId, name: competitionName });
    setInviteModalOpen(true);
  };

  const handleJoin = (competitionId: number, competitionName: string) => {
    const competition = competitions.find(c => c.id === competitionId);
    if (!competition) return;

    setSelectedCompetition({
      id: competition.id,
      name: competition.name,
      description: competition.description,
      startDate: competition.startDate,
      endDate: competition.endDate,
      paymentType: competition.paymentType,
    } as any);

    // If the user already paid (card or points) but never finished picking a
    // team, skip the payment modal and go straight to team selection so the
    // entry isn't wasted.
    const alreadyEntered = ((userResults as any)?.currentEntries || []).some(
      (e: any) => e.competitionId === competitionId,
    );

    const isPaid = competition.paymentType && competition.paymentType !== "free";
    if (isPaid && !alreadyEntered) {
      // Open the payment chooser (card or points)
      setPaymentModalOpen(true);
    } else {
      // Free comp OR already paid → go straight to team selection.
      setTeamSelectionModalOpen(true);
      setTimeout(() => {
        toast({
          title: alreadyEntered ? "You're already paid in" : "Choose Your Squad",
          description: alreadyEntered
            ? "Just pick a team to finish joining — no extra charge."
            : "Select a team to join or create a new one to complete your entry",
        });
      }, 500);
    }
  };

  const dismissCompetition = useMutation({
    mutationFn: async (competitionId: number) => {
      const response = await apiRequest("POST", `/api/competitions/${competitionId}/dismiss`, {
        userId: user?.id
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to dismiss competition");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "competition-results"] });
      toast({
        title: "Competition Dismissed",
        description: "Competition removed from your view.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDismiss = (competitionId: number) => {
    dismissCompetition.mutate(competitionId);
  };

  if (isLoading) {
    return <div className="min-h-screen backdrop-blur-md bg-white/5 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen backdrop-blur-md bg-white/5">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header Card */}
        <Card className="card-hero-green mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Trophy className="h-6 w-6 text-white" />
                <CardTitle className="text-white text-2xl">Join a Competition</CardTitle>
              </div>
              <Button 
                size="sm"
                onClick={() => setFindFriendsModalOpen(true)}
                className="bg-white text-black hover:bg-gray-100 font-semibold"
              >
                <Users className="h-4 w-4 mr-2" />
                Locate Buddies
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Activity filter: pick what you want to do, best-fit competitions rise to the top */}
        {competitions.length > 0 && openActivities.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-3" data-testid="section-activity-filter">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-military-green/60 bg-military-green/10 text-white hover:bg-military-green/20 hover:text-white"
                  data-testid="button-activity-filter"
                >
                  <SlidersHorizontal className="h-4 w-4 mr-2 text-military-green" />
                  {pickedActivities.length > 0
                    ? `${pickedActivities.length} ${pickedActivities.length === 1 ? "activity" : "activities"} picked`
                    : "What do you want to do?"}
                  <ChevronDown className="h-4 w-4 ml-2 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
                <DropdownMenuLabel>{filterFromOpenCompetitions ? "Activities in open competitions" : "Activities"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {openActivities.map((name) => (
                  <DropdownMenuCheckboxItem
                    key={name}
                    checked={pickedActivities.includes(name)}
                    onCheckedChange={() => togglePickedActivity(name)}
                    onSelect={(e) => e.preventDefault()}
                    className="capitalize"
                    data-testid={`checkbox-activity-${name}`}
                  >
                    {activityDisplayName(name)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {pickedActivities.length > 0 && (
              <>
                <div className="flex flex-wrap gap-2">
                  {pickedActivities.map((name) => (
                    <Badge
                      key={name}
                      variant="outline"
                      className="capitalize border-military-green/50 text-military-green bg-military-green/10"
                    >
                      {activityDisplayName(name)}
                    </Badge>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPickedActivities([])}
                  className="text-gray-300 hover:text-white hover:bg-white/10 h-8 px-2"
                  data-testid="button-clear-activity-filter"
                >
                  <X className="h-4 w-4 mr-1" /> Clear
                </Button>
              </>
            )}
          </div>
        )}

        {/* Pending Team Invitations */}
        {teamInvitations.length > 0 && (
          <div className="mb-6 space-y-3">
            {teamInvitations.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between gap-4 p-4 rounded-xl backdrop-blur-md bg-military-green/20 border border-military-green/40">
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="w-5 h-5 text-military-green shrink-0" />
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm">
                      <span className="text-military-green">{inv.inviter?.username || "Someone"}</span> invited you to join{" "}
                      <span className="text-military-green">{inv.team?.name || "a team"}</span>
                      {inv.competition?.name ? ` in ${inv.competition.name}` : ""}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">Expires {new Date(inv.expiresAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => acceptInvitation.mutate(inv.id)}
                    disabled={acceptInvitation.isPending}
                    className="bg-military-green hover:bg-military-green-light text-forest-green h-8 px-3"
                  >
                    <Check className="w-4 h-4 mr-1" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => declineInvitation.mutate(inv.id)}
                    disabled={declineInvitation.isPending}
                    className="border-white/20 text-white hover:bg-white/10 h-8 px-3"
                  >
                    <X className="w-4 h-4 mr-1" /> Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {competitions.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <div className="card-modern max-w-md mx-auto">
                <Trophy className="mx-auto h-20 w-20 text-muted mb-6" />
                <h2 className="text-2xl font-bold text-heading mb-4">No Open Competitions</h2>
                <p className="text-body mb-6">All competitions have closed their join windows</p>
                <p className="text-sm text-muted">Check back soon for new tactical operations!</p>
              </div>
            </div>
          ) : (
            rankedCompetitions.map((competition: any) => {
              // Find user result for this competition if it's completed
              const userResult = (userResults as any)?.history?.find(
                (h: any) => h.competitionId === competition.id
              );
              const matches = activityMatchCount(competition, pickedActivities);
              
              return (
                <div key={competition.id} className="relative">
                  {pickedActivities.length > 0 && matches > 0 && !competition.isCompleted && (
                    <div
                      className="absolute -top-3 left-4 z-10 inline-flex items-center gap-1 rounded-full bg-military-green px-3 py-1 text-xs font-semibold text-forest-green shadow"
                      data-testid={`badge-activity-match-${competition.id}`}
                    >
                      <Sparkles className="h-3 w-3" />
                      {matches === pickedActivities.length
                        ? "Fits everything you picked"
                        : `Fits ${matches} of ${pickedActivities.length} picks`}
                    </div>
                  )}
                  <CompetitionCard
                    competition={competition}
                    userResult={userResult ? {
                      finalRank: userResult.finalRank,
                      pointsEarned: userResult.pointsEarned,
                      teamName: userResult.team?.name
                    } : null}
                    onInvite={handleInvite}
                    onJoin={(id) => handleJoin(id, competition.name)}
                    onDismiss={handleDismiss}
                  />
                </div>
              );
            })
          )}
        </div>

      </main>

      {/* Invitation Modal */}
      {selectedCompetition && (
        <InviteBuddiesModal
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          competitionId={selectedCompetition.id}
          competitionName={selectedCompetition.name}
        />
      )}

      {/* Competition Payment Modal */}
      {selectedCompetition && (
        <CompetitionPaymentModal
          open={paymentModalOpen}
          onOpenChange={(next) => {
            setPaymentModalOpen(next);
            if (!next) setPendingInvitation(null);
          }}
          competition={selectedCompetition}
          onPaymentSuccess={() => {
            setPaymentModalOpen(false);

            // If this payment was for an invited paid competition, finish the
            // join into the inviter's team — skip team selection entirely.
            if (pendingInvitation) {
              completeInvitationAfterPayment.mutate(pendingInvitation.invitationId);
              return;
            }

            // Normal self-initiated paid join → fall through to team selection.
            setJustPaidEntry(true);
            setTeamSelectionModalOpen(true);
            setTimeout(() => {
              toast({
                title: "Choose Your Squad",
                description: "Select a team to join or create a new one to complete your entry",
              });
            }, 500);
          }}
        />
      )}

      {/* Team Selection Modal */}
      {selectedCompetition && (
        <TeamSelectionModal
          isOpen={teamSelectionModalOpen}
          onClose={() => {
            setTeamSelectionModalOpen(false);
            if (justPaidEntry) {
              toast({
                title: "Your entry is saved",
                description:
                  "We kept your payment on file. Come back to Competitions anytime to pick a team — you won't be charged again.",
                duration: 7000,
              });
              setJustPaidEntry(false);
            }
          }}
          competitionId={selectedCompetition.id}
          competitionName={selectedCompetition.name}
          onJoined={() => setJustPaidEntry(false)}
        />
      )}

      {/* Find Friends Modal */}
      <FindFriendsModal
        isOpen={findFriendsModalOpen}
        onClose={() => setFindFriendsModalOpen(false)}
      />
    </div>
  );
}

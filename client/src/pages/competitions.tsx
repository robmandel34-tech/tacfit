import { useState } from "react";
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
import { Trophy, Users, Mail, Check, X } from "lucide-react";

export default function Competitions() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuthRequired();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [teamSelectionModalOpen, setTeamSelectionModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [findFriendsModalOpen, setFindFriendsModalOpen] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<{ id: number; name: string; description?: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Fetch pending team invitations for this user
  const { data: teamInvitations = [] } = useQuery<any[]>({
    queryKey: ["/api/users", user?.id, "team-invitations"],
    queryFn: () => fetch(`/api/users/${user?.id}/team-invitations`, { credentials: "include" }).then(r => r.json()),
    enabled: !!user?.id,
  });

  const acceptInvitation = useMutation({
    mutationFn: async (invitationId: number) => {
      const res = await apiRequest("POST", `/api/team-invitations/${invitationId}/accept`, { userId: user?.id });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "team-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team-members", user?.id] });
      toast({ title: "Joined!", description: "You've joined the team. Head to Team to see your squad." });
    },
    onError: () => toast({ title: "Error", description: "Could not accept the invitation.", variant: "destructive" }),
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
    if (competition) {
      // Check if competition requires payment
      if (competition.paymentType === 'one_time' && competition.entryFee && competition.entryFee > 0) {
        // Show payment modal for paid competitions (with both points and Stripe options)
        setSelectedCompetition({ 
          id: competition.id, 
          name: competition.name, 
          description: competition.description 
        });
        setPaymentModalOpen(true);
      } else {
        // For free competitions, skip payment and go directly to team selection
        setSelectedCompetition({ 
          id: competition.id, 
          name: competition.name, 
          description: competition.description 
        });
        setTeamSelectionModalOpen(true);
        
        // Show helpful toast
        setTimeout(() => {
          toast({
            title: "Choose Your Squad",
            description: "Select a team to join or create a new one to complete your entry",
          });
        }, 500);
      }
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
        <Card className="bg-gradient-to-r from-military-green-dark to-military-green border-military-green/30 mb-8 rounded-none">
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
                    className="bg-military-green hover:bg-military-green-light text-white h-8 px-3"
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
            competitions.map((competition: any) => {
              // Find user result for this competition if it's completed
              const userResult = (userResults as any)?.history?.find(
                (h: any) => h.competitionId === competition.id
              );
              
              return (
                <CompetitionCard
                  key={competition.id}
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
          onOpenChange={setPaymentModalOpen}
          competition={selectedCompetition}
          onPaymentSuccess={() => {
            // After successful payment, open team selection modal
            setPaymentModalOpen(false);
            setTeamSelectionModalOpen(true);
            
            // Show helpful toast
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
          onClose={() => setTeamSelectionModalOpen(false)}
          competitionId={selectedCompetition.id}
          competitionName={selectedCompetition.name}
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

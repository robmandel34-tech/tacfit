import { useState } from "react";
import { useAuthRequired } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/navigation";
import CompetitionCard from "@/components/competition-card";
import InviteFriendsModal from "@/components/invite-friends-modal";
import TeamSelectionModal from "@/components/team-selection-modal";
import { Button } from "@/components/ui/button";
import { Trophy, Plus } from "lucide-react";

export default function Competitions() {
  const { user, isLoading } = useAuthRequired();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [teamSelectionModalOpen, setTeamSelectionModalOpen] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<{ id: number; name: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: competitions = [] } = useQuery({
    queryKey: ["/api/competitions"],
    enabled: !!user,
    select: (data: any[]) => {
      const now = new Date();
      
      // Add computed join window status to each competition
      const enrichedCompetitions = data.map(comp => {
        let joinWindowStatus = 'unknown';
        let canJoin = comp.isActive;
        
        if (comp.joinStartDate && comp.joinEndDate) {
          const joinStart = new Date(comp.joinStartDate);
          const joinEnd = new Date(comp.joinEndDate);
          
          if (now < joinStart) {
            joinWindowStatus = 'not-opened';
            canJoin = false;
          } else if (now > joinEnd) {
            joinWindowStatus = 'closed';
            canJoin = false;
          } else {
            joinWindowStatus = 'open';
            canJoin = comp.isActive;
          }
        } else if (comp.isActive) {
          joinWindowStatus = 'open';
          canJoin = true;
        }
        
        return {
          ...comp,
          joinWindowStatus,
          canJoin
        };
      });
      
      // Sort competitions: joinable first, then by join window status, then by start date
      return enrichedCompetitions.sort((a, b) => {
        // First sort by joinability (joinable competitions first)
        if (a.canJoin && !b.canJoin) return -1;
        if (!a.canJoin && b.canJoin) return 1;
        
        // Then sort by join window status priority
        const statusPriority = { 'open': 0, 'not-opened': 1, 'closed': 2, 'unknown': 3 };
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

  // Remove the old automatic joining logic

  const handleInvite = (competitionId: number, competitionName: string) => {
    setSelectedCompetition({ id: competitionId, name: competitionName });
    setInviteModalOpen(true);
  };

  const handleJoin = (competitionId: number, competitionName: string) => {
    setSelectedCompetition({ id: competitionId, name: competitionName });
    setTeamSelectionModalOpen(true);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-tactical-gray">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-12 gap-4">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-heading mb-3 tracking-tight">Tactical Operations</h1>
            <p className="text-body text-lg">Deploy with squads and dominate the battlefield</p>
          </div>
          <div className="flex flex-col items-end space-y-3 flex-shrink-0">
            {user && (user.points || 0) < 1000 && (
              <div className="text-xs text-muted text-right max-w-[140px] bg-surface-overlay px-2 py-1 rounded">
                Need {1000 - (user.points || 0)} more points
              </div>
            )}
            <Button 
              size="sm"
              className="btn-primary"
              disabled={!user || (user.points || 0) < 1000}
              onClick={() => {
                if ((user.points || 0) < 1000) {
                  toast({
                    title: "Insufficient tactical points",
                    description: "You need at least 1000 tactical points to create an operation. Keep fighting to earn more points!",
                    variant: "destructive",
                  });
                } else {
                  // TODO: Add competition creation modal/functionality
                  toast({
                    title: "Feature Coming Soon",
                    description: "Competition creation will be available soon!",
                  });
                }
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {competitions.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <div className="card-modern max-w-md mx-auto">
                <Trophy className="mx-auto h-20 w-20 text-muted mb-6" />
                <h2 className="text-2xl font-bold text-heading mb-4">No Competitions Yet</h2>
                <p className="text-body mb-6">Create your first competition to get started</p>
                {user && (user.points || 0) < 1000 && (
                  <div className="text-sm text-muted mb-6 bg-surface-overlay px-3 py-2 rounded-lg">
                    Need {1000 - (user.points || 0)} more points to create competitions
                  </div>
                )}
                <Button 
                  className="btn-primary"
                  disabled={!user || (user.points || 0) < 1000}
                  onClick={() => {
                    if ((user.points || 0) < 1000) {
                      toast({
                        title: "Insufficient Points",
                        description: "You need at least 1000 points to create a competition. Keep participating to earn more points!",
                        variant: "destructive",
                      });
                    } else {
                      // TODO: Add competition creation modal/functionality
                      toast({
                        title: "Feature Coming Soon",
                        description: "Competition creation will be available soon!",
                      });
                    }
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Competition
                </Button>
              </div>
            </div>
          ) : (
            competitions.map((competition: any) => (
              <CompetitionCard
                key={competition.id}
                competition={competition}
                onInvite={handleInvite}
                onJoin={(id) => handleJoin(id, competition.name)}
              />
            ))
          )}
        </div>

        {/* Invitation Modal */}
        {selectedCompetition && (
          <InviteFriendsModal
            isOpen={inviteModalOpen}
            onClose={() => setInviteModalOpen(false)}
            competitionId={selectedCompetition.id}
            competitionName={selectedCompetition.name}
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
      </main>
    </div>
  );
}

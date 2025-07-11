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
      
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Competitions</h1>
            <p className="text-gray-300">Join competitions and compete with teams</p>
          </div>
          <div className="flex flex-col items-end space-y-2">
            {user && (user.points || 0) < 1000 && (
              <div className="text-sm text-gray-400">
                Need {1000 - (user.points || 0)} more points to create competitions
              </div>
            )}
            <Button 
              className="bg-military-green hover:bg-military-green-light text-white disabled:opacity-50 disabled:cursor-not-allowed"
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {competitions.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <Trophy className="mx-auto h-16 w-16 text-gray-500 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">No Competitions Yet</h2>
              <p className="text-gray-400 mb-4">Create your first competition to get started</p>
              {user && (user.points || 0) < 1000 && (
                <div className="text-sm text-gray-400 mb-2">
                  Need {1000 - (user.points || 0)} more points to create competitions
                </div>
              )}
              <Button 
                className="bg-military-green hover:bg-military-green-light text-white disabled:opacity-50 disabled:cursor-not-allowed"
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

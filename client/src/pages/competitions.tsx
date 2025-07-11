import { useState } from "react";
import { useAuthRequired } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/navigation";
import CompetitionCard from "@/components/competition-card";
import InviteFriendsModal from "@/components/invite-friends-modal";
import { Button } from "@/components/ui/button";
import { Trophy, Plus } from "lucide-react";

export default function Competitions() {
  const { user, isLoading } = useAuthRequired();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<{ id: number; name: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: competitions = [] } = useQuery({
    queryKey: ["/api/competitions"],
    enabled: !!user,
  });

  const joinCompetitionMutation = useMutation({
    mutationFn: async (competitionId: number) => {
      const response = await apiRequest("POST", `/api/competitions/${competitionId}/join`, {
        userId: user?.id
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "You've joined the competition and been assigned to a team.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/team-members/${user?.id}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join competition",
        variant: "destructive",
      });
    },
  });

  const handleInvite = (competitionId: number, competitionName: string) => {
    setSelectedCompetition({ id: competitionId, name: competitionName });
    setInviteModalOpen(true);
  };

  const handleJoin = (competitionId: number) => {
    joinCompetitionMutation.mutate(competitionId);
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
          <Button className="bg-military-green hover:bg-military-green-light text-white">
            <Plus className="mr-2 h-4 w-4" />
            Create Competition
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {competitions.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <Trophy className="mx-auto h-16 w-16 text-gray-500 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">No Competitions Yet</h2>
              <p className="text-gray-400 mb-4">Create your first competition to get started</p>
              <Button className="bg-military-green hover:bg-military-green-light text-white">
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
                onJoin={handleJoin}
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
      </main>
    </div>
  );
}

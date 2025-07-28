import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Crown, Shield } from "lucide-react";

interface TeamSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  competitionId: number;
  competitionName: string;
}

interface Team {
  id: number;
  name: string;
  competitionId: number;
  captainId: number;
  points: number;
  motto: string;
  pictureUrl?: string;
  memberCount: number;
  members: Array<{
    id: number;
    userId: number;
    role: string;
    user: {
      id: number;
      username: string;
      avatar?: string;
    };
  }>;
}

export default function TeamSelectionModal({ 
  isOpen, 
  onClose, 
  competitionId, 
  competitionName 
}: TeamSelectionModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const { data: teams = [], isLoading } = useQuery({
    queryKey: [`/api/competitions/${competitionId}/teams-with-members`],
    queryFn: async () => {
      const response = await fetch(`/api/competitions/${competitionId}/teams-with-members`);
      return response.json();
    },
    enabled: isOpen && !!competitionId,
  });

  const joinTeamMutation = useMutation({
    mutationFn: async (teamId: number) => {
      const response = await apiRequest("POST", `/api/teams/${teamId}/join`, {
        userId: user?.id
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "You've successfully joined the team!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/team-members/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/competitions/${competitionId}/teams-with-members`] });
      queryClient.invalidateQueries({ queryKey: [`/api/teams`] });
      queryClient.invalidateQueries({ queryKey: [`/api/competitions`] });
      onClose();
      // Navigate to team page after successful join
      setLocation("/team");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join team",
        variant: "destructive",
      });
    },
  });

  const createNewTeamMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/competitions/${competitionId}/create-team`, {
        userId: user?.id
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "You've created a new team and joined the competition!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/team-members/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/competitions/${competitionId}/teams-with-members`] });
      queryClient.invalidateQueries({ queryKey: [`/api/teams`] });
      queryClient.invalidateQueries({ queryKey: [`/api/competitions`] });
      onClose();
      // Navigate to team page after successful team creation
      setLocation("/team");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create team",
        variant: "destructive",
      });
    },
  });

  const getInitials = (username: string) => {
    return username.split(' ').map(word => word[0]).join('').toUpperCase() || username.slice(0, 2).toUpperCase();
  };

  const handleJoinTeam = (teamId: number) => {
    joinTeamMutation.mutate(teamId);
  };

  const handleCreateNewTeam = () => {
    createNewTeamMutation.mutate();
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-tactical-gray-light border-tactical-gray">
          <DialogHeader>
            <DialogTitle className="text-white">Loading Teams...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="text-white">Loading team information...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (selectedTeam) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-tactical-gray-light border-tactical-gray">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedTeam.name}</DialogTitle>
            <Button 
              variant="ghost" 
              onClick={() => setSelectedTeam(null)}
              className="absolute right-12 top-4 text-gray-400 hover:text-white"
            >
              ← Back to Teams
            </Button>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-gray-300 italic">"{selectedTeam.motto}"</p>
              <div className="flex items-center justify-center space-x-4 mt-2">
                <Badge variant="outline" className="text-combat-orange">
                  {selectedTeam.points} Points
                </Badge>
                <Badge variant="outline">
                  {selectedTeam.memberCount}/5 Members
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-white font-semibold">Team Members:</h3>
              
              {selectedTeam.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-tactical-gray rounded-lg">
                  <div className="flex items-center space-x-3">
                    {member.user.avatar ? (
                      <img
                        src={`/uploads/${member.user.avatar}`}
                        alt="Profile picture"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-military-green rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-xs">
                          {getInitials(member.user.username)}
                        </span>
                      </div>
                    )}
                    <span className="text-white font-medium">{member.user.username}</span>
                    {member.role === 'captain' && (
                      <Crown className="w-4 h-4 text-yellow-400" />
                    )}
                  </div>
                </div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: 5 - selectedTeam.memberCount }, (_, index) => (
                <div key={`empty-${index}`} className="flex items-center justify-between p-3 bg-tactical-gray-lighter rounded-lg border-2 border-dashed border-tactical-gray">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                      <UserPlus className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="text-gray-400">Open Slot</span>
                  </div>
                  <Button
                    onClick={() => handleJoinTeam(selectedTeam.id)}
                    disabled={joinTeamMutation.isPending}
                    className="bg-military-green hover:bg-military-green-light text-white px-4 py-2"
                  >
                    {joinTeamMutation.isPending ? "Joining..." : "Join Here"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto bg-tactical-gray-light border-tactical-gray">
        <DialogHeader>
          <DialogTitle className="text-white">Choose Your Team - {competitionName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-gray-300">
            Select a team to join the competition. Click on any team to see their members and available spots.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map((team: Team) => (
              <Card 
                key={team.id} 
                className="bg-tactical-gray border-tactical-gray hover:border-military-green cursor-pointer transition-all"
                onClick={() => setSelectedTeam(team)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-lg">{team.name}</CardTitle>
                    <Badge variant="outline" className="text-combat-orange">
                      {team.points} PTS
                    </Badge>
                  </div>
                  <p className="text-gray-400 text-sm italic">"{team.motto}"</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-300">
                          {team.memberCount}/5 Members
                        </span>
                      </div>
                      <Badge 
                        variant={team.memberCount < 5 ? "default" : "secondary"}
                        className={team.memberCount < 5 ? "bg-green-600" : "bg-gray-600"}
                      >
                        {team.memberCount < 5 ? `${5 - team.memberCount} Open` : "Full"}
                      </Badge>
                    </div>
                    
                    <div className="flex -space-x-2">
                      {team.members.slice(0, 4).map((member) => (
                        <div key={member.id} className="relative">
                          {member.user.avatar ? (
                            <img
                              src={`/uploads/${member.user.avatar}`}
                              alt="Profile picture"
                              className="w-8 h-8 rounded-full object-cover border-2 border-tactical-gray-light"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-military-green rounded-full flex items-center justify-center border-2 border-tactical-gray-light">
                              <span className="text-white font-bold text-xs">
                                {getInitials(member.user.username)}
                              </span>
                            </div>
                          )}
                          {member.role === 'captain' && (
                            <Crown className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400" />
                          )}
                        </div>
                      ))}
                      {team.memberCount > 4 && (
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center border-2 border-tactical-gray-light">
                          <span className="text-white font-bold text-xs">
                            +{team.memberCount - 4}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="border-t border-tactical-gray pt-4">
            <Card className="bg-tactical-gray-lighter border-tactical-gray border-dashed">
              <CardContent className="p-4">
                <div className="text-center space-y-2">
                  <Shield className="w-8 h-8 text-gray-400 mx-auto" />
                  <h3 className="text-white font-semibold">Create New Team</h3>
                  <p className="text-gray-400 text-sm">
                    Don't see a team you like? Start your own and become the captain!
                  </p>
                  <Button
                    onClick={handleCreateNewTeam}
                    disabled={createNewTeamMutation.isPending}
                    className="bg-military-green hover:bg-military-green-light text-white"
                  >
                    {createNewTeamMutation.isPending ? "Creating..." : "Create New Team"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useAuthRequired } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Navigation from "@/components/navigation";
import ActivityCard from "@/components/activity-card";
import ProgressMap from "@/components/progress-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Target, Calendar, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function CompetitionStatus() {
  const { user, isLoading } = useAuthRequired();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's current team membership
  const { data: userTeamMember } = useQuery({
    queryKey: [`/api/team-members/${user?.id}`],
    enabled: !!user,
  });

  // Get competition details
  const { data: competition } = useQuery({
    queryKey: [`/api/competitions/${userTeamMember?.[0]?.team?.competitionId}`],
    enabled: !!userTeamMember?.[0]?.team?.competitionId,
  });

  // Get all teams in the competition
  const { data: teams = [] } = useQuery({
    queryKey: [`/api/teams/competition/${userTeamMember?.[0]?.team?.competitionId}`],
    enabled: !!userTeamMember?.[0]?.team?.competitionId,
  });

  // Get all activities for the competition
  const { data: activities = [] } = useQuery({
    queryKey: [`/api/activities/competition/${userTeamMember?.[0]?.team?.competitionId}`],
    enabled: !!userTeamMember?.[0]?.team?.competitionId,
  });

  // Leave competition mutation
  const leaveCompetitionMutation = useMutation({
    mutationFn: async () => {
      const teamMemberId = userTeamMember?.[0]?.id;
      if (!teamMemberId) throw new Error("No team membership found");
      
      return apiRequest("DELETE", `/api/team-members/${teamMemberId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Left Competition",
        description: "You have successfully left the competition and team",
      });
      
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/team-members/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
      
      // Navigate back to home/dashboard
      navigate("/");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to leave competition",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user || !userTeamMember || userTeamMember.length === 0) {
    return (
      <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
        <div className="text-center">
          <Trophy className="mx-auto h-16 w-16 text-gray-500 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Active Competition</h2>
          <p className="text-gray-400">Join a competition to view status</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tactical-gray pb-20">
      <Navigation />
      
      <main className="container mx-auto px-4 py-6">
        {/* Competition Header */}
        {competition && (
          <Card className="mb-6 tile-card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center">
                  <Trophy className="mr-2 h-5 w-5" />
                  {competition.name}
                </CardTitle>
                <Badge variant={competition.isActive ? "default" : "secondary"}>
                  {competition.isActive ? "Active" : "Upcoming"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">{competition.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-400">
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>
                    {new Date(competition.startDate).toLocaleDateString()} - {new Date(competition.endDate).toLocaleDateString()}
                  </span>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => leaveCompetitionMutation.mutate()}
                  disabled={leaveCompetitionMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white sharp-button"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {leaveCompetitionMutation.isPending ? "Leaving..." : "Leave Competition"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Map */}
        {competition && teams.length > 0 && (
          <div className="mb-6">
            <ProgressMap teams={teams} competitionName={competition.name} />
          </div>
        )}

        {/* Team Leaderboard */}
        <Card className="mb-6 sharp-card bg-tactical-gray-light border-tactical-gray">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Team Standings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teams.sort((a: any, b: any) => b.points - a.points).map((team: any, index: number) => (
                <div 
                  key={team.id} 
                  className="flex items-center justify-between p-3 bg-tactical-gray rounded-sm cursor-pointer hover:bg-tactical-gray-light transition-colors"
                  onClick={() => navigate(`/team/${team.id}`)}
                >
                  <div className="flex items-center">
                    <div className="relative w-8 h-8 mr-3">
                      {team.pictureUrl ? (
                        <img 
                          src={team.pictureUrl} 
                          alt={`${team.name} team picture`}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-500 text-black' :
                          index === 1 ? 'bg-gray-400 text-black' :
                          index === 2 ? 'bg-amber-600 text-black' :
                          'bg-tactical-gray-light text-gray-300'
                        }`}>
                          {index + 1}
                        </div>
                      )}
                      {/* Ranking badge overlay */}
                      <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border border-white flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-gray-400 text-black' :
                        index === 2 ? 'bg-amber-600 text-black' :
                        'bg-tactical-gray-light text-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-white">{team.name}</div>
                      <div className="text-sm text-gray-400">{team.motto || 'No motto set'}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Target className="mr-1 h-4 w-4 text-military-green" />
                    <span className="text-military-green font-bold">{team.points}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="sharp-card bg-tactical-gray-light border-tactical-gray">
          <CardHeader>
            <CardTitle className="text-white">All Competition Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                  <p className="text-gray-400">No activities submitted yet</p>
                </div>
              ) : (
                activities.map((activity: any) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
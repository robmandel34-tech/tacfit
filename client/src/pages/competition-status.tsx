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
                  variant="outline"
                  size="sm"
                  onClick={() => leaveCompetitionMutation.mutate()}
                  disabled={leaveCompetitionMutation.isPending}
                  className="bg-red-100 hover:bg-red-200 text-red-700 border-red-300 hover:border-red-400 sharp-button"
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
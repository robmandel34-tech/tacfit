import { useAuthRequired } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Navigation from "@/components/navigation";
import ActivityCard from "@/components/activity-card";
import ProgressMap from "@/components/progress-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trophy, Users, Target, Calendar, LogOut, Activity, CheckCircle, Clock } from "lucide-react";
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
        {/* Header Card */}
        {competition && (
          <Card className="bg-gradient-to-r from-military-green-dark to-military-green border-military-green/30 mb-8">
            <CardHeader className="pb-6">
              {/* Top Row: Title and Actions */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/10 rounded-lg p-2">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-2xl font-bold mb-1">{competition.name}</CardTitle>
                    <Badge 
                      className={`${
                        new Date() < new Date(competition.startDate) 
                          ? "bg-orange-500/20 text-orange-200 border-orange-400/30" 
                          : new Date() > new Date(competition.endDate)
                          ? "bg-gray-500/20 text-gray-200 border-gray-400/30"
                          : "bg-white/20 text-white border-white/30"
                      } text-xs`}
                    >
                      {new Date() < new Date(competition.startDate) ? (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          Starts in {Math.ceil((new Date(competition.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                        </>
                      ) : new Date() > new Date(competition.endDate) ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </>
                      ) : (
                        <>
                          <Activity className="h-3 w-3 mr-1" />
                          {Math.ceil((new Date(competition.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/10 hover:text-red-200 transition-colors"
                      disabled={leaveCompetitionMutation.isPending}
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      <span className="text-xs">Leave</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-tactical-gray-light border-tactical-gray-lighter">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">Leave Competition</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-300">
                        Are you sure you want to leave this competition? You will lose your team membership and progress.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-tactical-gray border-tactical-gray-lighter text-white hover:bg-tactical-gray-light">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => leaveCompetitionMutation.mutate()}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Leave Competition
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Description */}
              {competition.description && (
                <div className="text-gray-100 text-sm mb-4 leading-relaxed">
                  {competition.description}
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/10 rounded-lg p-3 flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-white flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-200 uppercase tracking-wide mb-1">Duration</div>
                    <div className="text-white font-medium text-sm">
                      {new Date(competition.startDate).toLocaleDateString()} - {new Date(competition.endDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 rounded-lg p-3 flex items-center space-x-3">
                  <Users className="h-5 w-5 text-white flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-200 uppercase tracking-wide mb-1">Teams</div>
                    <div className="text-white font-medium text-sm">{teams.length} competing</div>
                  </div>
                </div>

                {competition.requiredActivities && competition.requiredActivities.length > 0 && (
                  <div className="bg-white/10 rounded-lg p-3 flex items-center space-x-3">
                    <Target className="h-5 w-5 text-white flex-shrink-0" />
                    <div>
                      <div className="text-xs text-gray-200 uppercase tracking-wide mb-1">Activities</div>
                      <div className="text-white font-medium text-sm">
                        {competition.requiredActivities.join(", ")}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>
        )}



        {/* Progress Map */}
        {competition && teams.length > 0 && (
          <div className="mb-6">
            <ProgressMap teams={teams} competitionName="" competition={competition} />
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
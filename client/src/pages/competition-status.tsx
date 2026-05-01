import { useState, useMemo } from "react";
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
  const [selectedType, setSelectedType] = useState<string | null>(null);

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

  // Group activities by type and count them
  const activityTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (Array.isArray(activities)) {
      activities.forEach((activity: any) => {
        const type = activity.type || "other";
        counts[type] = (counts[type] || 0) + 1;
      });
    }
    return counts;
  }, [activities]);

  // Filter activities based on selected type
  const filteredActivities = useMemo(() => {
    if (!Array.isArray(activities)) return [];
    if (!selectedType) return activities;
    return activities.filter((activity: any) => activity.type === selectedType);
  }, [activities, selectedType]);

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

  const typeLabels: Record<string, string> = {
    cardio: "Cardio",
    strength: "Strength",
    flexibility: "Flexibility",
    mobility: "Mobility",
    meditation: "Meditation",
    sports: "Sports",
    other: "Other",
  };

  return (
    <div className="min-h-screen backdrop-blur-md bg-white/5 pb-20">
      <Navigation />
      
      <main className="container mx-auto px-4 py-6">
        {/* Header Card */}
        {competition && (
          <Card className="bg-gradient-to-r from-military-green-dark to-military-green border-military-green/30 mb-8 rounded-none">
            <CardHeader className="pb-4">
              {/* Top Row: Title and Actions */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3 flex-1">
                  <Trophy className="h-6 w-6 text-white flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-white text-xl font-semibold leading-tight">{competition.name}</CardTitle>
                    {competition.description && (
                      <p className="text-gray-200 text-sm mt-1 line-clamp-1">{competition.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                  <Badge 
                    className={`${
                      new Date() < new Date(competition.startDate) 
                        ? "bg-orange-500/20 text-orange-200 border-orange-400/30" 
                        : new Date() > new Date(competition.endDate)
                        ? "bg-gray-500/20 text-gray-200 border-gray-400/30"
                        : "bg-white/20 text-white border-white/30"
                    } text-xs font-medium`}
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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:bg-white/10 hover:text-red-200 transition-colors p-2"
                        disabled={leaveCompetitionMutation.isPending}
                      >
                        <LogOut className="h-4 w-4" />
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
              </div>

              {/* Bottom Row: Competition Details */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-200">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-300" />
                  <span>{new Date(competition.startDate).toLocaleDateString()} - {new Date(competition.endDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-gray-300" />
                  <span>{teams.length} teams competing</span>
                </div>
                {Array.isArray(competition.requiredActivities) && competition.requiredActivities.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-gray-300" />
                    <span>{competition.requiredActivities.join(", ")}</span>
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Progress Map */}
        {competition && teams.length > 0 && (
          <div className="mb-6">
            <ProgressMap teams={teams} competitionName="" competition={competition} activities={activities} />
          </div>
        )}

        {/* Activity Feed */}
        <Card className="bg-tactical-gray-light border-tactical-gray rounded-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-white">All Competition Activities</CardTitle>

            {/* Activity Type Filter Bubbles */}
            {Object.keys(activityTypeCounts).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {/* All bubble */}
                <button
                  onClick={() => setSelectedType(null)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    selectedType === null
                      ? "bg-military-green text-white border-military-green shadow-md"
                      : "bg-white/10 text-gray-300 border-white/20 hover:bg-white/20 hover:text-white"
                  }`}
                >
                  All
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    selectedType === null ? "bg-white/20" : "bg-white/10"
                  }`}>
                    {Array.isArray(activities) ? activities.length : 0}
                  </span>
                </button>

                {/* Per-type bubbles */}
                {Object.entries(activityTypeCounts).map(([type, count]) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(selectedType === type ? null : type)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                      selectedType === type
                        ? "bg-military-green text-white border-military-green shadow-md"
                        : "bg-white/10 text-gray-300 border-white/20 hover:bg-white/20 hover:text-white"
                    }`}
                  >
                    {typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1)}
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                      selectedType === type ? "bg-white/20" : "bg-white/10"
                    }`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredActivities.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                  <p className="text-gray-400">
                    {selectedType
                      ? `No ${typeLabels[selectedType] || selectedType} activities yet`
                      : "No activities submitted yet"}
                  </p>
                </div>
              ) : (
                filteredActivities.map((activity: any) => (
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

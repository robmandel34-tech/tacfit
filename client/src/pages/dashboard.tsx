import { useAuthRequired } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Crosshair, Flame, UserPlus, Trophy, Dumbbell, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Dashboard() {
  const { user, isLoading } = useAuthRequired();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: competitions = [] } = useQuery({
    queryKey: ["/api/competitions"],
    enabled: !!user,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["/api/activities"],
    enabled: !!user,
  });

  const { data: userTeamMembership } = useQuery({
    queryKey: [`/api/team-members/${user?.id}`],
    enabled: !!user?.id,
  });

  // Join competition mutation
  const joinCompetitionMutation = useMutation({
    mutationFn: async (competitionId: number) => {
      return apiRequest("POST", `/api/competitions/${competitionId}/join`, {
        userId: user?.id
      });
    },
    onSuccess: () => {
      toast({
        title: "Joined Competition",
        description: "You have successfully joined the competition and been assigned to a team",
      });
      
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: [`/api/team-members/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join competition",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>;
  }

  if (!user) return null;

  const activeCompetitions = competitions.filter((comp: any) => comp.isActive);
  const recentActivities = activities.slice(0, 3);
  const hasJoinedCompetition = userTeamMembership && userTeamMembership.length > 0;
  const canCreateCompetition = user?.points >= 1000; // Points threshold for creating competitions

  return (
    <div className="min-h-screen bg-tactical-gray">
      <Navigation />
      
      <main className="container mx-auto px-4 py-6">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-military-green-dark to-military-green tile-card-elevated p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Command Center</h1>
                <p className="text-gray-200 text-lg">Tactical overview and mission status</p>
              </div>
              <div className="hidden md:block">
                <Crosshair className="text-6xl text-military-green-light" />
              </div>
            </div>
          </div>
        </div>

        {/* Active Competition Banner */}
        {activeCompetitions.length > 0 && (
          <div className="mb-8">
            <div className="inner-tile border border-combat-orange p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-combat-orange rounded-lg flex items-center justify-center">
                    <Flame className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Active Operation: {activeCompetitions[0].name}</h3>
                    <p className="text-gray-300">Squad deployed | Mission in progress</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-combat-orange font-bold text-xl">Active</div>
                  <div className="text-gray-300 text-sm">{user.points} points</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Right Column - Quick Actions & Activity */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="tile-card">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Tactical Commands</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    className="w-full bg-tactical-gray-lighter hover:bg-tactical-gray-lightest text-white"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Locate Allies
                  </Button>
                  {!hasJoinedCompetition && (
                    <div className="text-center py-4 text-gray-400">
                      <p className="text-sm">Deploy to operation to unlock squad features</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="tile-card">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Latest Intel</CardTitle>
                <p className="text-gray-400 text-sm">Field reports from all active operations</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.length === 0 ? (
                    <div className="text-center py-8 text-gray-300">
                      <Users className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                      <p>No field reports</p>
                      <p className="text-sm text-gray-400">Activity from all operations will appear here</p>
                    </div>
                  ) : (
                    recentActivities.map((activity: any) => (
                      <div key={activity.id} className="content-tile p-4">
                        <div className="flex items-start space-x-3">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={activity.user?.avatar ? `/uploads/${activity.user.avatar}` : undefined} />
                            <AvatarFallback className="bg-military-green text-white">
                              {activity.user?.username?.slice(0, 2).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-white font-bold text-sm">{activity.user?.username || "Unknown Operator"}</span>
                              <span className="text-gray-400 text-xs">
                                {new Date(activity.createdAt).toLocaleDateString()}
                              </span>
                              <Badge variant="outline" className="text-xs text-gray-300 border-gray-600">
                                {activity.type || "General"}
                              </Badge>
                            </div>
                            <p className="text-gray-300 text-sm">{activity.description}</p>
                            {activity.points && (
                              <div className="flex items-center mt-2">
                                <span className="text-combat-orange text-xs font-bold">
                                  +{activity.points} tactical points
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

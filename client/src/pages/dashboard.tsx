import { useAuthRequired } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Crosshair, Flame, UserPlus, Trophy, Dumbbell, Users, Mountain, Activity, Plus, MessageSquare } from "lucide-react";
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
          
          {/* Left Column - Competition Status & Progress */}
          <div className="lg:col-span-2 space-y-6">
            {hasJoinedCompetition ? (
              <>
                {/* User's Active Competition Progress */}
                <Card className="tile-card">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-white flex items-center">
                      <Trophy className="mr-3 h-5 w-5 text-combat-orange" />
                      Your Mission Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="content-tile p-4 text-center">
                          <div className="text-2xl font-bold text-combat-orange">{user?.points || 0}</div>
                          <div className="text-gray-400 text-sm">Total Points</div>
                        </div>
                        <div className="content-tile p-4 text-center">
                          <div className="text-2xl font-bold text-military-green">{activities.filter((a: any) => a.userId === user?.id).length}</div>
                          <div className="text-gray-400 text-sm">Activities</div>
                        </div>
                        <div className="content-tile p-4 text-center">
                          <div className="text-2xl font-bold text-steel-blue">#{activities.filter((a: any) => a.userId === user?.id).length > 0 ? Math.floor(Math.random() * 10) + 1 : 'N/A'}</div>
                          <div className="text-gray-400 text-sm">Rank</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Mission Actions */}
                <Card className="tile-card">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-white">Mission Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button 
                        className="bg-military-green hover:bg-military-green-dark text-white"
                        onClick={() => window.location.href = '/team'}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        View Squad
                      </Button>
                      <Button 
                        className="bg-combat-orange hover:bg-combat-orange/90 text-white"
                        onClick={() => window.location.href = '/competition-status'}
                      >
                        <Trophy className="mr-2 h-4 w-4" />
                        Competition Status
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                {/* Available Competitions */}
                <Card className="tile-card">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-white flex items-center">
                      <Mountain className="mr-3 h-5 w-5 text-military-green" />
                      Available Operations
                    </CardTitle>
                    <p className="text-gray-400 text-sm">Join an active competition to start your mission</p>
                  </CardHeader>
                  <CardContent>
                    {activeCompetitions.length > 0 ? (
                      <div className="space-y-3">
                        {activeCompetitions.slice(0, 2).map((competition: any) => (
                          <div key={competition.id} className="content-tile p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="text-white font-semibold">{competition.name}</h4>
                                <p className="text-gray-400 text-sm">{competition.description}</p>
                              </div>
                              <Button 
                                size="sm"
                                className="bg-military-green hover:bg-military-green-dark text-white"
                                onClick={() => window.location.href = '/competitions'}
                              >
                                Deploy
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button 
                          variant="outline" 
                          className="w-full border-military-green text-military-green hover:bg-military-green hover:text-white"
                          onClick={() => window.location.href = '/competitions'}
                        >
                          View All Operations
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-300">
                        <Mountain className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                        <p>No active operations</p>
                        <p className="text-sm text-gray-400">Check back soon for new missions</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Getting Started Guide */}
                <Card className="tile-card">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold text-white">Mission Briefing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="content-tile p-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-military-green rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                          <div>
                            <h5 className="text-white font-semibold">Join an Operation</h5>
                            <p className="text-gray-400 text-sm">Deploy to an active competition and join a squad</p>
                          </div>
                        </div>
                      </div>
                      <div className="content-tile p-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-combat-orange rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                          <div>
                            <h5 className="text-white font-semibold">Complete Training</h5>
                            <p className="text-gray-400 text-sm">Submit fitness activities to earn tactical points</p>
                          </div>
                        </div>
                      </div>
                      <div className="content-tile p-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-steel-blue rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                          <div>
                            <h5 className="text-white font-semibold">Achieve Victory</h5>
                            <p className="text-gray-400 text-sm">Work with your squad to complete mission objectives</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Right Column - Quick Actions & Activity */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="tile-card">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Tactical Commands</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {hasJoinedCompetition ? (
                    <>
                      <Button 
                        className="w-full bg-military-green hover:bg-military-green-dark text-white"
                        onClick={() => window.location.href = '/team'}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Squad Command
                      </Button>
                      <Button 
                        className="w-full bg-combat-orange hover:bg-combat-orange/90 text-white"
                        onClick={() => {
                          // Open activity submission modal logic would go here
                          toast({
                            title: "Feature Available",
                            description: "Visit your team page to submit activities",
                          });
                        }}
                      >
                        <Activity className="mr-2 h-4 w-4" />
                        Submit Activity
                      </Button>
                      <Button 
                        className="w-full bg-steel-blue hover:bg-steel-blue/90 text-white"
                        onClick={() => window.location.href = '/competition-status'}
                      >
                        <Trophy className="mr-2 h-4 w-4" />
                        Mission Status
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button 
                        className="w-full bg-military-green hover:bg-military-green-dark text-white"
                        onClick={() => window.location.href = '/competitions'}
                      >
                        <Mountain className="mr-2 h-4 w-4" />
                        Browse Operations
                      </Button>
                      {canCreateCompetition && (
                        <Button 
                          className="w-full bg-combat-orange hover:bg-combat-orange/90 text-white"
                          onClick={() => window.location.href = '/admin'}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Create Operation
                        </Button>
                      )}
                      <div className="text-center py-4 text-gray-400">
                        <p className="text-sm">Deploy to operation to unlock squad features</p>
                      </div>
                    </>
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

import { useAuthRequired } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crosshair, Flame, UserPlus, Trophy, Dumbbell, Users } from "lucide-react";

export default function Dashboard() {
  const { user, isLoading } = useAuthRequired();

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
          <div className="bg-gradient-to-r from-military-green-dark to-military-green rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Mission Control</h1>
                <p className="text-gray-200 text-lg">Ready for your next challenge, soldier?</p>
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
            <div className="bg-tactical-gray-light border border-combat-orange rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-combat-orange rounded-lg flex items-center justify-center">
                    <Flame className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Current Mission: {activeCompetitions[0].name}</h3>
                    <p className="text-gray-300">Team: Active Squad | Competition in progress</p>
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
          {/* Left Column - Competitions & Teams */}
          <div className="lg:col-span-2 space-y-6">
            {/* Available Competitions */}
            <Card className="bg-tactical-gray-light border-tactical-gray">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold text-white">Available Missions</CardTitle>
                  {canCreateCompetition && (
                    <Button className="bg-military-green hover:bg-military-green-light text-white">
                      <Trophy className="mr-2 h-4 w-4" />
                      Create Mission
                    </Button>
                  )}
                  {!canCreateCompetition && (
                    <div className="text-gray-400 text-sm">
                      Need 1000+ points to create missions
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {competitions.length === 0 ? (
                    <div className="text-center py-8 text-gray-300">
                      <Trophy className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                      <p>No competitions available</p>
                      <p className="text-sm text-gray-400">Create your first competition to get started</p>
                    </div>
                  ) : (
                    competitions.map((competition: any) => (
                      <div key={competition.id} className="bg-tactical-gray-lighter rounded-lg p-4 border border-tactical-gray">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-steel-blue rounded-lg flex items-center justify-center">
                              <Dumbbell className="text-white" />
                            </div>
                            <div>
                              <h3 className="text-white font-bold">{competition.name}</h3>
                              <p className="text-gray-300 text-sm">{competition.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={competition.isActive ? "default" : "secondary"}>
                              {competition.isActive ? "ACTIVE" : "UPCOMING"}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-gray-300 text-sm">
                            <Trophy className="inline mr-1" size={16} />
                            Competitive challenge
                          </div>
                          <Button 
                            className="bg-military-green hover:bg-military-green-light text-white"
                            size="sm"
                          >
                            Join Mission
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Actions & Activity */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="bg-tactical-gray-light border-tactical-gray">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    className="w-full bg-tactical-gray-lighter hover:bg-tactical-gray-lightest text-white"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Find Friends
                  </Button>
                  {!hasJoinedCompetition && (
                    <div className="text-center py-4 text-gray-400">
                      <p className="text-sm">Join a competition to unlock team features</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-tactical-gray-light border-tactical-gray">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white">Latest Intel</CardTitle>
                <p className="text-gray-400 text-sm">Recent activity from all active competitions</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.length === 0 ? (
                    <div className="text-center py-8 text-gray-300">
                      <Users className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                      <p>No recent activity</p>
                      <p className="text-sm text-gray-400">Activity from all competitions will appear here</p>
                    </div>
                  ) : (
                    recentActivities.map((activity: any) => (
                      <div key={activity.id} className="bg-tactical-gray-lighter rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-military-green rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-sm">
                              {activity.user?.username?.slice(0, 2).toUpperCase() || "U"}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-white font-bold text-sm">{activity.user?.username || "Unknown"}</span>
                              <span className="text-gray-400 text-xs">
                                {new Date(activity.createdAt).toLocaleDateString()}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {activity.type || "General"}
                              </Badge>
                            </div>
                            <p className="text-gray-300 text-sm">{activity.description}</p>
                            {activity.points && (
                              <div className="flex items-center mt-2">
                                <span className="text-combat-orange text-xs font-bold">
                                  +{activity.points} points
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

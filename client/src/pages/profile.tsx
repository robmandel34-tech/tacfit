import { useAuthRequired } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Users, Calendar } from "lucide-react";

export default function Profile() {
  const { user, isLoading } = useAuthRequired();

  const { data: history = [] } = useQuery({
    queryKey: ["/api/history", user?.id],
    enabled: !!user,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["/api/activities", { userId: user?.id }],
    enabled: !!user,
  });

  if (isLoading) {
    return <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>;
  }

  if (!user) return null;

  const getInitials = (username: string) => {
    return username.split(' ').map(word => word[0]).join('').toUpperCase() || username.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-tactical-gray">
      <Navigation />
      
      <main className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
          <p className="text-gray-300">Your fitness journey and achievements</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Info */}
          <div className="lg:col-span-1">
            <Card className="bg-tactical-gray-light border-tactical-gray">
              <CardHeader>
                <CardTitle className="text-white">Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="w-20 h-20 bg-military-green rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-2xl">
                      {getInitials(user.username)}
                    </span>
                  </div>
                  <h2 className="text-white font-bold text-xl mb-2">{user.username}</h2>
                  <p className="text-gray-400 text-sm mb-4">{user.email}</p>
                  
                  <div className="bg-tactical-gray-lighter rounded-lg p-4">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <Trophy className="text-combat-orange h-5 w-5" />
                      <span className="text-combat-orange font-bold text-lg">{user.points}</span>
                    </div>
                    <p className="text-gray-400 text-sm">Total Points</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats and History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-tactical-gray-light border-tactical-gray">
                <CardContent className="p-4 text-center">
                  <Target className="mx-auto h-8 w-8 text-military-green mb-2" />
                  <div className="text-2xl font-bold text-white">{activities.length}</div>
                  <div className="text-sm text-gray-400">Activities</div>
                </CardContent>
              </Card>
              
              <Card className="bg-tactical-gray-light border-tactical-gray">
                <CardContent className="p-4 text-center">
                  <Users className="mx-auto h-8 w-8 text-steel-blue mb-2" />
                  <div className="text-2xl font-bold text-white">{history.length}</div>
                  <div className="text-sm text-gray-400">Competitions</div>
                </CardContent>
              </Card>
              
              <Card className="bg-tactical-gray-light border-tactical-gray">
                <CardContent className="p-4 text-center">
                  <Trophy className="mx-auto h-8 w-8 text-combat-orange mb-2" />
                  <div className="text-2xl font-bold text-white">0</div>
                  <div className="text-sm text-gray-400">Wins</div>
                </CardContent>
              </Card>
            </div>

            {/* Competition History */}
            <Card className="bg-tactical-gray-light border-tactical-gray">
              <CardHeader>
                <CardTitle className="text-white">Competition History</CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                    <p className="text-gray-300">No competition history yet</p>
                    <p className="text-sm text-gray-400">Join your first competition to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((record: any) => (
                      <div key={record.id} className="bg-tactical-gray-lighter rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-white font-bold">{record.competition?.name}</h3>
                            <p className="text-gray-300 text-sm">Team: {record.team?.name}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="mb-2">
                              {record.finalRank ? `#${record.finalRank}` : "Completed"}
                            </Badge>
                            <div className="text-sm text-gray-400">
                              {record.pointsEarned} points earned
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

import { useAuthRequired } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Crown, UserPlus } from "lucide-react";

export default function Team() {
  const { user, isLoading } = useAuthRequired();

  const { data: teams = [] } = useQuery({
    queryKey: ["/api/teams"],
    enabled: !!user,
  });

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
            <h1 className="text-3xl font-bold text-white mb-2">Teams</h1>
            <p className="text-gray-300">Manage your teams and join new ones</p>
          </div>
          <Button className="bg-military-green hover:bg-military-green-light text-white">
            <Plus className="mr-2 h-4 w-4" />
            Create Team
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Teams */}
          <Card className="bg-tactical-gray-light border-tactical-gray">
            <CardHeader>
              <CardTitle className="text-white">My Teams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teams.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                    <p className="text-gray-300">You're not on any teams yet</p>
                    <p className="text-sm text-gray-400">Join a team or create your own</p>
                  </div>
                ) : (
                  teams.map((team: any) => (
                    <div key={team.id} className="bg-tactical-gray-lighter rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-military-green rounded-lg flex items-center justify-center">
                            <Users className="text-white" />
                          </div>
                          <div>
                            <h3 className="text-white font-bold">{team.name}</h3>
                            <p className="text-gray-300 text-sm">{team.points} points</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-green-400 border-green-400">
                          Active
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">
                          <Crown className="inline mr-1 h-4 w-4" />
                          Captain
                        </span>
                        <Button size="sm" variant="outline" className="border-tactical-gray text-white">
                          View Team
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Available Teams */}
          <Card className="bg-tactical-gray-light border-tactical-gray">
            <CardHeader>
              <CardTitle className="text-white">Available Teams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8">
                  <UserPlus className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                  <p className="text-gray-300">No teams recruiting</p>
                  <p className="text-sm text-gray-400">Check back later for new opportunities</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

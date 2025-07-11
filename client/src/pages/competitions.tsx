import { useAuthRequired } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Plus, Users, Calendar, Target } from "lucide-react";

export default function Competitions() {
  const { user, isLoading } = useAuthRequired();

  const { data: competitions = [] } = useQuery({
    queryKey: ["/api/competitions"],
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
            <h1 className="text-3xl font-bold text-white mb-2">Competitions</h1>
            <p className="text-gray-300">Join competitions and compete with teams</p>
          </div>
          <Button className="bg-military-green hover:bg-military-green-light text-white">
            <Plus className="mr-2 h-4 w-4" />
            Create Competition
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {competitions.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <Trophy className="mx-auto h-16 w-16 text-gray-500 mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">No Competitions Yet</h2>
              <p className="text-gray-400 mb-4">Create your first competition to get started</p>
              <Button className="bg-military-green hover:bg-military-green-light text-white">
                <Plus className="mr-2 h-4 w-4" />
                Create Competition
              </Button>
            </div>
          ) : (
            competitions.map((competition: any) => (
              <Card key={competition.id} className="bg-tactical-gray-light border-tactical-gray">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">{competition.name}</CardTitle>
                    <Badge variant={competition.isActive ? "default" : "secondary"}>
                      {competition.isActive ? "Active" : "Upcoming"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">{competition.description}</p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-400">
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>
                        {new Date(competition.startDate).toLocaleDateString()} - {new Date(competition.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-400">
                      <Users className="mr-2 h-4 w-4" />
                      <span>Max {competition.maxTeams} teams</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-400">
                      <Target className="mr-2 h-4 w-4" />
                      <span>Competitive challenge</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-tactical-gray">
                    <Button className="w-full bg-military-green hover:bg-military-green-light text-white">
                      {competition.isActive ? "Join Now" : "Register Interest"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Crown } from "lucide-react";

interface TeamFormationProps {
  competitionId?: number;
}

export default function TeamFormation({ competitionId }: TeamFormationProps) {
  const { data: teams = [] } = useQuery({
    queryKey: ["/api/teams", { competitionId }],
    enabled: !!competitionId,
  });

  const getInitials = (username: string) => {
    return username.split(' ').map(word => word[0]).join('').toUpperCase() || username.slice(0, 2).toUpperCase();
  };

  return (
    <Card className="bg-tactical-gray-light border-tactical-gray">
      <CardHeader>
        <CardTitle className="text-white">Team Formation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {teams.map((team: any) => (
            <div key={team.id} className="bg-tactical-gray-lighter rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
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
              
              <div className="grid grid-cols-5 gap-3">
                {/* Team members would be rendered here */}
                <div className="bg-tactical-gray-lighter rounded-lg p-3 text-center">
                  <div className="w-12 h-12 bg-military-green rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-white font-bold text-sm">JS</span>
                  </div>
                  <div className="text-white font-medium text-sm">Captain</div>
                  <div className="text-gray-400 text-xs">
                    <Crown className="inline h-3 w-3" />
                  </div>
                </div>
                
                {/* Open slot */}
                <div className="bg-tactical-gray border-2 border-dashed border-tactical-gray rounded-lg p-3 text-center">
                  <div className="w-12 h-12 bg-tactical-gray-lightest rounded-full flex items-center justify-center mx-auto mb-2">
                    <Plus className="text-gray-600" />
                  </div>
                  <div className="text-gray-400 font-medium text-sm">Open</div>
                  <div className="text-gray-500 text-xs">Slot</div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-between items-center">
                <span className="text-gray-400 text-sm">2/5 members</span>
                <Button size="sm" className="bg-military-green hover:bg-military-green-light text-white">
                  Join Team
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

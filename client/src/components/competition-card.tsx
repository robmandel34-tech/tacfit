import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Calendar, Users, Target } from "lucide-react";

interface CompetitionCardProps {
  competition: {
    id: number;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    maxTeams: number;
    isActive: boolean;
  };
}

export default function CompetitionCard({ competition }: CompetitionCardProps) {
  return (
    <Card className="bg-tactical-gray-light border-tactical-gray">
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
            <Trophy className="mr-2 h-4 w-4" />
            {competition.isActive ? "Join Now" : "Register Interest"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

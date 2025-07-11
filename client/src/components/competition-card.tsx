import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trophy, Calendar, Users, Target, Share2, Activity, CheckCircle } from "lucide-react";

interface CompetitionCardProps {
  competition: {
    id: number;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    maxTeams: number;
    isActive: boolean;
    requiredActivities?: string[];
    targetGoals?: string[];
  };
  onInvite?: (competitionId: number, competitionName: string) => void;
  onJoin?: (competitionId: number) => void;
}

export default function CompetitionCard({ competition, onInvite, onJoin }: CompetitionCardProps) {
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
          
          {competition.requiredActivities && competition.requiredActivities.length > 0 && (
            <>
              <Separator className="bg-tactical-gray" />
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-300">
                  <Activity className="mr-2 h-4 w-4" />
                  <span className="font-medium">Required Activities:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {competition.requiredActivities.map((activity, index) => (
                    <Badge key={index} variant="outline" className="text-xs capitalize">
                      {activity}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
          
          {competition.targetGoals && competition.targetGoals.length > 0 && (
            <>
              <Separator className="bg-tactical-gray" />
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-300">
                  <Target className="mr-2 h-4 w-4" />
                  <span className="font-medium">Team Goals:</span>
                </div>
                <div className="space-y-1">
                  {competition.targetGoals.map((goal, index) => (
                    <div key={index} className="flex items-center text-xs text-gray-400">
                      <CheckCircle className="mr-2 h-3 w-3" />
                      <span>{goal}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="mt-4 pt-4 border-t border-tactical-gray">
          <div className="flex gap-2">
            <Button 
              onClick={() => onJoin?.(competition.id)}
              className="flex-1 bg-military-green hover:bg-military-green-light text-white sharp-button"
            >
              <Trophy className="mr-2 h-4 w-4" />
              {competition.isActive ? "Join Now" : "Register Interest"}
            </Button>
            {onInvite && (
              <Button 
                onClick={() => onInvite(competition.id, competition.name)}
                variant="outline"
                className="sharp-button border-military-green text-military-green hover:bg-military-green hover:text-white"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

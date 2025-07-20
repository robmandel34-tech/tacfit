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
    joinStartDate?: string;
    joinEndDate?: string;
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
    <Card className={`card-modern hover-lift fade-in group ${competition.isActive ? 'ring-2 ring-military-green/30 border-military-green/50' : ''}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-heading text-xl mb-2 group-hover:text-military-green transition-colors">
              {competition.name}
            </CardTitle>
            {competition.isActive && (
              <div className="text-xs text-military-green font-medium bg-military-green/10 px-2 py-1 rounded-full inline-block mb-2">
                🟢 Join Window Open
              </div>
            )}
          </div>
          <Badge 
            variant={competition.isActive ? "default" : "secondary"}
            className={`${competition.isActive 
              ? 'bg-success-green text-white' 
              : 'bg-surface-overlay text-secondary'} font-medium`}
          >
            {competition.isActive ? "Active" : "Upcoming"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-body mb-6 leading-relaxed">{competition.description}</p>
        
        <div className="space-y-4">
          {competition.joinStartDate && competition.joinEndDate && (
            <div className="flex items-center text-sm text-muted">
              <Calendar className="mr-3 h-4 w-4 text-military-green" />
              <div className="flex flex-col">
                <span className="font-medium text-military-green text-xs">Join Window:</span>
                <span className="font-medium">
                  {new Date(competition.joinStartDate).toLocaleDateString()} - {new Date(competition.joinEndDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
          
          <div className="flex items-center text-sm text-muted">
            <Calendar className="mr-3 h-4 w-4 text-steel-blue" />
            <div className="flex flex-col">
              <span className="font-medium text-steel-blue text-xs">Competition:</span>
              <span className="font-medium">
                {new Date(competition.startDate).toLocaleDateString()} - {new Date(competition.endDate).toLocaleDateString()}
              </span>
            </div>
          </div>
          
          <div className="flex items-center text-sm text-muted">
            <Users className="mr-3 h-4 w-4 text-steel-blue" />
            <span className="font-medium">Max {competition.maxTeams} squads</span>
          </div>
          
          {competition.requiredActivities && competition.requiredActivities.length > 0 && (
            <>
              <Separator className="bg-border-subtle my-4" />
              <div className="space-y-3">
                <div className="flex items-center text-sm text-secondary">
                  <Activity className="mr-3 h-4 w-4 text-military-green" />
                  <span className="font-semibold">Required Training:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {competition.requiredActivities.map((activity, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className="text-xs capitalize bg-surface-overlay border-border-subtle text-secondary hover:bg-military-green hover:text-white transition-colors"
                    >
                      {activity}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
          
          {competition.targetGoals && competition.targetGoals.length > 0 && (
            <>
              <Separator className="bg-border-subtle my-4" />
              <div className="space-y-3">
                <div className="flex items-center text-sm text-secondary">
                  <Target className="mr-3 h-4 w-4 text-combat-orange" />
                  <span className="font-semibold">Team Goals:</span>
                </div>
                <div className="space-y-2">
                  {competition.targetGoals.map((goal, index) => (
                    <div key={index} className="flex items-center text-sm text-muted bg-surface-overlay rounded-lg p-2">
                      <CheckCircle className="mr-3 h-4 w-4 text-success flex-shrink-0" />
                      <span className="font-medium">{goal}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="mt-6 pt-4 border-t border-border-subtle">
          <div className="flex gap-3">
            <Button 
              onClick={() => onJoin?.(competition.id)}
              className="flex-1 btn-primary"
            >
              <Trophy className="mr-2 h-4 w-4" />
              {competition.isActive ? "Join Now" : "Register Interest"}
            </Button>
            {onInvite && (
              <Button 
                onClick={() => onInvite(competition.id, competition.name)}
                variant="outline"
                className="btn-secondary border-military-green text-military-green hover:bg-military-green hover:text-white"
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

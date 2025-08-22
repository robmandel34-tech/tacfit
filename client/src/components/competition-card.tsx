import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trophy, Calendar, Users, Target, Share2, Activity, CheckCircle, DollarSign, Medal, X, Star } from "lucide-react";

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
    isCompleted?: boolean;
    requiredActivities?: string[];
    targetGoals?: string[];
    joinWindowStatus?: string;
    canJoin?: boolean;
    paymentType?: 'free' | 'one_time';
    entryFee?: number;
  };
  userResult?: {
    finalRank?: number;
    pointsEarned?: number;
    teamName?: string;
  } | null;
  onInvite?: (competitionId: number, competitionName: string) => void;
  onJoin?: (competitionId: number) => void;
  onDismiss?: (competitionId: number) => void;
}

export default function CompetitionCard({ competition, userResult, onInvite, onJoin, onDismiss }: CompetitionCardProps) {
  return (
    <GlassCard 
      blur="lg" 
      opacity={0.12} 
      hover={true} 
      glow={competition.isActive}
      className={`fade-in group ${competition.isActive ? 'ring-2 ring-military-green/40 border-military-green/60' : ''}`}
    >
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-white text-xl font-bold mb-2 group-hover:text-military-green transition-colors">
              {competition.name}
            </h3>
            {competition.isCompleted && userResult ? (
              <div className="flex items-center gap-2 mb-2">
                {userResult.finalRank === 1 && (
                  <div className="text-xs text-yellow-300 font-medium bg-yellow-500/20 px-2 py-1 rounded-full inline-flex items-center gap-1 border border-yellow-500/30">
                    <Trophy className="w-3 h-3" />
                    1st Place Winner!
                  </div>
                )}
                {userResult.finalRank === 2 && (
                  <div className="text-xs text-gray-200 font-medium bg-gray-500/20 px-2 py-1 rounded-full inline-flex items-center gap-1 border border-gray-500/30">
                    <Medal className="w-3 h-3" />
                    2nd Place
                  </div>
                )}
                {userResult.finalRank === 3 && (
                  <div className="text-xs text-orange-300 font-medium bg-orange-500/20 px-2 py-1 rounded-full inline-flex items-center gap-1 border border-orange-500/30">
                    <Medal className="w-3 h-3" />
                    3rd Place
                  </div>
                )}
                {userResult.finalRank && userResult.finalRank > 3 && (
                  <div className="text-xs text-gray-400 font-medium bg-gray-400/10 px-2 py-1 rounded-full inline-block">
                    {userResult.finalRank}th Place
                  </div>
                )}
                {userResult.pointsEarned && userResult.pointsEarned > 0 && (
                  <div className="text-xs text-military-green font-medium bg-military-green/10 px-2 py-1 rounded-full inline-flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    +{userResult.pointsEarned} pts
                  </div>
                )}
              </div>
            ) : (
              <>
                {competition.joinWindowStatus === 'open' && (
                  <div className="text-xs text-military-green font-medium bg-military-green/10 px-2 py-1 rounded-full inline-block mb-2">
                    🟢 Join Window Open
                  </div>
                )}
                {competition.joinWindowStatus === 'closed' && (
                  <div className="text-xs text-red-400 font-medium bg-red-400/10 px-2 py-1 rounded-full inline-block mb-2">
                    🔴 Join Window Closed
                  </div>
                )}
                {competition.joinWindowStatus === 'not-opened' && (
                  <div className="text-xs text-yellow-400 font-medium bg-yellow-400/10 px-2 py-1 rounded-full inline-block mb-2">
                    🟡 Join Window Not Yet Open
                  </div>
                )}
              </>
            )}
          </div>
          <Badge 
            variant={competition.canJoin ? "default" : "secondary"}
            className={`${competition.canJoin 
              ? 'bg-success-green text-white' 
              : 'bg-surface-overlay text-secondary'} font-medium`}
          >
            {competition.joinWindowStatus === 'open' ? "Joinable" : 
             competition.joinWindowStatus === 'closed' ? "Closed" : 
             competition.joinWindowStatus === 'not-opened' ? "Soon" : 
             competition.isActive ? "Active" : "Upcoming"}
          </Badge>
        </div>
      </div>
      <div className="px-6 pt-0">
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

          {/* Payment Information */}
          <div className="flex items-center text-sm text-muted">
            <DollarSign className="mr-3 h-4 w-4 text-military-green" />
            <div className="flex flex-col">
              <span className="font-medium text-military-green text-xs">Entry Cost:</span>
              <span className="font-medium">
                {competition.paymentType === 'free' || !competition.entryFee ? 
                  'Free to join' : 
                  `$${(competition.entryFee / 100).toFixed(2)} per participant`
                }
              </span>
            </div>
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
            {competition.isCompleted && userResult ? (
              // Show results and dismiss option for completed competitions
              <>
                <div className="flex-1 space-y-2">
                  {userResult.teamName && (
                    <p className="text-sm text-gray-300">
                      Team: <span className="text-white font-medium">{userResult.teamName}</span>
                    </p>
                  )}
                  <p className="text-sm text-gray-300">
                    Final Ranking: <span className="font-medium">
                      {userResult.finalRank === 1 ? <span className="text-yellow-400">1st Place</span> : 
                       userResult.finalRank === 2 ? <span className="text-gray-300">2nd Place</span> : 
                       userResult.finalRank === 3 ? <span className="text-orange-400">3rd Place</span> : 
                       <span className="text-white">{userResult.finalRank}th Place</span>}
                    </span>
                  </p>
                </div>
                <Button 
                  onClick={() => onDismiss?.(competition.id)}
                  variant="outline"
                  size="sm"
                  className="btn-secondary border-gray-500 text-gray-400 hover:bg-red-500 hover:text-white hover:border-red-500"
                >
                  <X className="mr-1 h-3 w-3" />
                  Dismiss
                </Button>
              </>
            ) : (
              // Show join options for active competitions
              <>
                <Button 
                  onClick={() => onJoin?.(competition.id)}
                  disabled={!competition.canJoin}
                  className={`flex-1 ${competition.canJoin ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'}`}
                >
                  <Trophy className="mr-2 h-4 w-4" />
                  {competition.joinWindowStatus === 'open' ? 
                    (competition.paymentType === 'one_time' && competition.entryFee ? 
                      `Join - $${(competition.entryFee / 100).toFixed(2)}` : 
                      "Join Now"
                    ) : 
                   competition.joinWindowStatus === 'closed' ? "Join Closed" : 
                   competition.joinWindowStatus === 'not-opened' ? "Not Open Yet" : 
                   competition.isActive ? "Join Now" : "Register Interest"}
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
              </>
            )}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

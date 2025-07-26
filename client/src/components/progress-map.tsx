import { useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, MapPin, Mountain, Flag } from "lucide-react";

interface Team {
  id: number;
  name: string;
  points: number;
  motto?: string;
  pictureUrl?: string;
}

interface Competition {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  requiredActivities?: string[];
  targetGoals?: string[];
}

interface ProgressMapProps {
  teams: Team[];
  competitionName: string;
  competition?: Competition;
  activities?: any[];
}

export default function ProgressMap({ teams, competitionName, competition, activities = [] }: ProgressMapProps) {
  const [, navigate] = useLocation();
  
  // Check if competition has started
  const competitionHasStarted = competition ? new Date() >= new Date(competition.startDate) : true;
  
  // Calculate actual progress based on target goals like the team page does
  const calculateTeamProgress = useMemo(() => {
    if (!competition || !competition.requiredActivities || !competition.targetGoals) {
      return (teamId: number) => 0;
    }

    return (teamId: number) => {
      // If competition hasn't started, all teams stay at base camp (0% progress)
      if (!competitionHasStarted) {
        return 0;
      }

      // Get activities for this team that were submitted after competition start
      const teamActivities = activities.filter(activity => {
        const isTeamActivity = activity.teamId === teamId;
        const submittedAfterStart = new Date(activity.createdAt) >= new Date(competition.startDate);
        return isTeamActivity && submittedAfterStart;
      });

      let totalProgress = 0;
      let activityCount = 0;

      competition.requiredActivities.forEach((activityType: string, index: number) => {
        // Get activities of this type for the team
        const activitiesOfType = teamActivities.filter(activity => activity.type === activityType);
        
        // Calculate total quantity for this activity type
        const totalQuantity = activitiesOfType.reduce((sum: number, activity: any) => {
          const quantity = parseInt(activity.quantity || '0');
          return sum + quantity;
        }, 0);

        // Get target goal for this activity type
        const targetGoal = competition.targetGoals?.[index] || '';
        const targetNumber = parseInt(targetGoal.replace(/[^0-9]/g, '')) || 0;
        
        if (targetNumber > 0) {
          const percentage = Math.min((totalQuantity / targetNumber) * 100, 100);
          totalProgress += percentage;
          activityCount++;
        }
      });

      return activityCount > 0 ? Math.round(totalProgress / activityCount) : 0;
    };
  }, [activities, competition, competitionHasStarted]);

  // Sort teams by progress percentage, then by points as tiebreaker
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      const progressA = calculateTeamProgress(a.id);
      const progressB = calculateTeamProgress(b.id);
      
      if (progressA !== progressB) {
        return progressB - progressA; // Higher progress first
      }
      
      return b.points - a.points; // Points as tiebreaker
    });
  }, [teams, calculateTeamProgress]);

  // Calculate progress percentage for each team using target goals
  const teamsWithProgress = useMemo(() => {
    return sortedTeams.map((team, index) => {
      const progressPercentage = calculateTeamProgress(team.id);
      
      return {
        ...team,
        progress: progressPercentage, // Use actual progress based on target goals
        rank: index + 1
      };
    });
  }, [sortedTeams, calculateTeamProgress]);

  // Generate topographical features along the route
  const features = [
    { position: 10, icon: Flag, name: "Base Camp", color: "text-green-600", x: 12, y: 84 },
    { position: 90, icon: Trophy, name: "Victory Point", color: "text-yellow-600", x: 75, y: 12 }
  ];

  return (
    <div className="w-full">
      {/* Tab-like header for Team Progress Map */}
      <div className="relative">
        <div className="flex justify-center mb-0">
          <div className="bg-tactical-gray-light border-tactical-gray border-t-2 border-l-2 border-r-2 rounded-t-xl px-6 py-2 tile-card" style={{ 
            borderBottomLeftRadius: 0, 
            borderBottomRightRadius: 0,
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3), 0 4px 8px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
          }}>
            <h3 className="text-base font-semibold text-white">Team Progress Map</h3>
          </div>
        </div>
        
        {/* Map Container */}
        <Card className="w-full tile-card-elevated">
          <CardContent className="p-6">
            {/* Competition Not Started Warning */}
            {!competitionHasStarted && competition && (
              <div className="mb-4 bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Flag className="h-5 w-5 text-orange-500" />
                  <h3 className="font-semibold text-orange-100">Competition Awaiting Start</h3>
                </div>
                <p className="text-sm text-orange-200">
                  Teams are assembled at Base Camp. Progress tracking begins when the competition starts on {new Date(competition.startDate).toLocaleDateString()}.
                </p>
              </div>
            )}
            
            <div className="relative">
              {/* Map Background */}
              <div className="relative h-96 rounded-xl overflow-visible shadow-lg" style={{
                boxShadow: '0 8px 16px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.1)'
              }}>
                <div className="absolute inset-0 rounded-xl overflow-hidden">
                  {/* High-Quality Wilderness Terrain Background */}
                  <div 
                    className="w-full h-full bg-cover bg-center"
                    style={{
                      backgroundImage: `url('/user-terrain-image.jpeg')`,
                      filter: 'brightness(1.3) contrast(1.1) saturate(1.2)'
                    }}
                  />
                  
                  {/* Enhanced overlay for better visibility and contrast */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/50" />

                  {/* Weaving diagonal route path from bottom left to top right */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                    {/* Background stroke for better visibility */}
                    <path d="M12,80 Q18,72 27,76 Q36,82 46,66 Q56,50 66,55 Q76,60 85,10" 
                          stroke="rgba(0,0,0,0.6)" 
                          strokeWidth="2" 
                          fill="none" />
                    {/* Main route path - thin with dashes */}
                    <path d="M12,80 Q18,72 27,76 Q36,82 46,66 Q56,50 66,55 Q76,60 85,10" 
                          stroke="rgba(255,255,255,0.95)" 
                          strokeWidth="1" 
                          fill="none"
                          strokeDasharray="6,3" />
                    {/* Inner glowing effect */}
                    <path d="M12,80 Q18,72 27,76 Q36,82 46,66 Q56,50 66,55 Q76,60 85,10" 
                          stroke="rgba(134,239,172,0.8)" 
                          strokeWidth="0.5" 
                          fill="none"
                          strokeDasharray="6,3" />
                  </svg>

                  {/* Topographical features */}
                  {features.map((feature, index) => (
                    <div
                      key={index}
                      className={`absolute flex items-center ${feature.name === 'Victory Point' ? 'flex-row-reverse' : 'flex-col'}`}
                      style={{
                        left: `${feature.x}%`,
                        top: `${feature.y}%`,
                        transform: feature.name === 'Victory Point' ? 'translate(-50%, -50%)' : 'translate(-50%, -50%)'
                      }}
                    >
                      <div className={`p-2 rounded-full bg-black/60 border-2 border-white/30 ${feature.color}`}>
                        <feature.icon className="h-4 w-4 drop-shadow-lg" />
                      </div>
                      <span className={`text-xs text-white font-medium drop-shadow-lg bg-black/40 px-2 py-1 rounded ${
                        feature.name === 'Victory Point' ? 'mr-2' : 'mt-1'
                      }`}>{feature.name}</span>
                    </div>
                  ))}

              {/* Team markers */}
              {teamsWithProgress.map((team, index) => {
                // Calculate position along the weaving route path
                // Map 85% progress to 0.75 (75% of visible path, before Victory Point)
                const progress = Math.min((team.progress / 85) * 0.75, 1.2);
                
                // Weaving path calculation matching the exact SVG curve
                const t = progress;
                
                // Calculate position based on the rotated SVG path points
                let pathX, pathY;
                if (t <= 0.2) {
                  // Start to first curve: M12,80 Q18,72 27,76
                  const localT = t / 0.2;
                  pathX = 12 + (15 * localT);
                  pathY = 80 - (8 * localT) + (4 * Math.sin(localT * Math.PI));
                } else if (t <= 0.4) {
                  // First to second curve: Q36,82 46,66
                  const localT = (t - 0.2) / 0.2;
                  pathX = 27 + (19 * localT);
                  pathY = 76 + (6 * localT) - (16 * localT * localT);
                } else if (t <= 0.6) {
                  // Second to third curve: Q56,50 66,55
                  const localT = (t - 0.4) / 0.2;
                  pathX = 46 + (20 * localT);
                  pathY = 66 - (16 * localT) + (5 * Math.sin(localT * Math.PI));
                } else if (t <= 0.8) {
                  // Third to fourth curve: Q76,60 85,10
                  const localT = (t - 0.6) / 0.2;
                  pathX = 66 + (19 * localT);
                  pathY = 55 + (5 * localT) - (50 * localT * localT);
                } else {
                  // Beyond screen (cut off)
                  const localT = (t - 0.8) / 0.4;
                  pathX = 85 + (15 * localT); // Continue beyond right edge
                  pathY = 10 - (25 * localT); // Continue upward off screen
                }
              
                return (
                  <div
                    key={team.id}
                    className="absolute flex flex-col items-center transition-all duration-1000 ease-out"
                    style={{
                      left: `${pathX}%`,
                      top: `${pathY}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    {/* Team marker */}
                    <div className="relative group cursor-pointer" onClick={() => navigate(`/team/${team.id}`)}>
                      {/* Team picture or default icon */}
                      <div className="w-8 h-8 rounded-full border-2 border-white shadow-lg overflow-hidden bg-tactical-gray hover:ring-2 hover:ring-military-green transition-all">
                        {team.pictureUrl ? (
                          <img 
                            src={team.pictureUrl} 
                            alt={team.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${
                            index === 0 ? 'bg-yellow-500' : 
                            index === 1 ? 'bg-gray-400' : 
                            index === 2 ? 'bg-amber-600' : 
                            'bg-military-green'
                          }`}>
                            <span className="text-white font-bold text-xs">{team.rank}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Rank indicator */}
                      <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border border-white flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-500 text-black' : 
                        index === 1 ? 'bg-gray-400 text-black' : 
                        index === 2 ? 'bg-amber-600 text-black' : 
                        'bg-military-green text-white'
                      }`}>
                        {team.rank}
                      </div>
                      
                      {/* Team info tooltip */}
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 shadow-xl border border-white/20">
                        <div className="font-semibold text-sm">{team.name}</div>
                        <div className="text-military-green font-bold">{team.points} points</div>
                        {team.motto && <div className="text-gray-300 italic text-xs mt-1">"{team.motto}"</div>}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black/90" />
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>

              {/* Team leaderboard */}
              <div className="mt-6 space-y-3">
                {teamsWithProgress.map((team) => (
                  <div 
                    key={team.id} 
                    className="inner-tile p-4 cursor-pointer"
                    onClick={() => navigate(`/team/${team.id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-military-green text-white border-military-green">
                          #{team.rank}
                        </Badge>
                        <h3 className="font-semibold text-white">{team.name}</h3>
                      </div>
                      <div className="text-military-green font-bold">
                        {!competitionHasStarted ? "At Base Camp" : `${Math.round(Math.min(team.progress, 100))}%`}
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                      <div 
                        className="bg-military-green h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(team.progress, 100)}%` }}
                      />
                    </div>
                    
                    <div className="text-sm text-gray-400">
                      {!competitionHasStarted ? "Awaiting competition start" : `${Math.round(Math.min(team.progress, 100))}% complete`}
                    </div>
                    
                    {team.motto && (
                      <div className="text-xs text-gray-500 italic mt-1">
                        "{team.motto}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
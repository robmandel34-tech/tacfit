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

interface ProgressMapProps {
  teams: Team[];
  competitionName: string;
}

export default function ProgressMap({ teams, competitionName }: ProgressMapProps) {
  const [, navigate] = useLocation();
  
  // Sort teams by points to determine their position on the route
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => b.points - a.points);
  }, [teams]);

  // Calculate progress percentage for each team
  const teamsWithProgress = useMemo(() => {
    const maxPoints = Math.max(...teams.map(t => t.points), 1);
    return sortedTeams.map((team, index) => ({
      ...team,
      progress: Math.max((team.points / maxPoints) * 85, 5), // 5% minimum, 85% maximum
      rank: index + 1
    }));
  }, [sortedTeams, teams]);

  // Generate topographical features along the route
  const features = [
    { position: 10, icon: Flag, name: "Base Camp", color: "text-green-600", x: 12, y: 80 },
    { position: 90, icon: Trophy, name: "Victory Point", color: "text-yellow-600", x: 88, y: 20 }
  ];

  return (
    <div className="w-full">
      {/* Competition Title - Centered above everything */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white">{competitionName}</h2>
      </div>
      
      {/* Tab-like header for Team Progress Map */}
      <div className="relative">
        <div className="flex justify-center mb-0">
          <div className="bg-tactical-gray-light border-tactical-gray border-t border-l border-r rounded-t-xl px-6 py-3 shadow-lg">
            <h3 className="text-lg font-semibold text-white">Team Progress Map</h3>
          </div>
        </div>
        
        {/* Map Container */}
        <Card className="w-full bg-tactical-gray-light border-tactical-gray rounded-xl rounded-tl-none shadow-lg" style={{
          boxShadow: '0 4px 12px rgba(0,0,0,0.15), 0 2px 6px rgba(0,0,0,0.1)'
        }}>
          <CardContent className="p-6">
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
                    <path d="M10,85 Q20,75 30,80 Q40,85 50,70 Q60,55 70,60 Q80,65 90,15" 
                          stroke="rgba(0,0,0,0.6)" 
                          strokeWidth="3" 
                          fill="none" />
                    {/* Main route path - thin with dashes */}
                    <path d="M10,85 Q20,75 30,80 Q40,85 50,70 Q60,55 70,60 Q80,65 90,15" 
                          stroke="rgba(255,255,255,0.95)" 
                          strokeWidth="1.5" 
                          fill="none"
                          strokeDasharray="6,3" />
                    {/* Inner glowing effect */}
                    <path d="M10,85 Q20,75 30,80 Q40,85 50,70 Q60,55 70,60 Q80,65 90,15" 
                          stroke="rgba(134,239,172,0.8)" 
                          strokeWidth="1" 
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
                        transform: feature.name === 'Victory Point' ? 'translate(-100%, -50%)' : 'translate(-50%, -50%)'
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
                
                // Calculate position based on the actual SVG path points
                let pathX, pathY;
                if (t <= 0.2) {
                  // Start to first curve: M10,85 Q20,75 30,80
                  const localT = t / 0.2;
                  pathX = 10 + (20 * localT);
                  pathY = 85 - (10 * localT) + (5 * Math.sin(localT * Math.PI));
                } else if (t <= 0.4) {
                  // First to second curve: Q40,85 50,70
                  const localT = (t - 0.2) / 0.2;
                  pathX = 30 + (20 * localT);
                  pathY = 80 + (5 * localT) - (15 * localT * localT);
                } else if (t <= 0.6) {
                  // Second to third curve: Q60,55 70,60
                  const localT = (t - 0.4) / 0.2;
                  pathX = 50 + (20 * localT);
                  pathY = 70 - (15 * localT) + (5 * Math.sin(localT * Math.PI));
                } else if (t <= 0.8) {
                  // Third to fourth curve: Q80,65 90,15
                  const localT = (t - 0.6) / 0.2;
                  pathX = 70 + (20 * localT);
                  pathY = 60 + (5 * localT) - (50 * localT * localT);
                } else {
                  // Beyond screen (cut off)
                  const localT = (t - 0.8) / 0.4;
                  pathX = 90 + (20 * localT); // Continue beyond right edge
                  pathY = 15 - (30 * localT); // Continue upward off screen
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
                      <div className="text-military-green font-bold">{team.points} pts</div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                      <div 
                        className="bg-military-green h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(team.progress, 100)}%` }}
                      />
                    </div>
                    
                    <div className="text-sm text-gray-400">
                      {Math.round(Math.min(team.progress, 100))}% complete
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
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
    { position: 10, icon: Flag, name: "Base Camp", color: "text-green-600", x: 10, y: 85 },
    { position: 90, icon: Trophy, name: "Victory Point", color: "text-yellow-600", x: 90, y: 15 }
  ];

  return (
    <Card className="w-full bg-tactical-gray-light border-tactical-gray">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {competitionName} - Team Progress Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Map Background */}
          <div className="relative h-96 rounded-lg overflow-hidden">
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

            {/* Sleek diagonal route path from bottom left to top right */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              {/* Background stroke for better visibility */}
              <path d="M10,85 Q25,75 40,65 Q55,50 70,35 Q80,25 90,15" 
                    stroke="rgba(0,0,0,0.7)" 
                    strokeWidth="5" 
                    fill="none" />
              {/* Main route path - sleek and smooth */}
              <path d="M10,85 Q25,75 40,65 Q55,50 70,35 Q80,25 90,15" 
                    stroke="rgba(255,255,255,0.98)" 
                    strokeWidth="3" 
                    fill="none"
                    strokeLinecap="round" />
              {/* Inner glowing effect */}
              <path d="M10,85 Q25,75 40,65 Q55,50 70,35 Q80,25 90,15" 
                    stroke="rgba(134,239,172,0.9)" 
                    strokeWidth="1.5" 
                    fill="none"
                    strokeLinecap="round" />
              {/* Subtle outer glow */}
              <path d="M10,85 Q25,75 40,65 Q55,50 70,35 Q80,25 90,15" 
                    stroke="rgba(134,239,172,0.3)" 
                    strokeWidth="8" 
                    fill="none"
                    strokeLinecap="round" />
            </svg>

            {/* Topographical features */}
            {features.map((feature, index) => (
              <div
                key={index}
                className="absolute flex flex-col items-center"
                style={{
                  left: `${feature.x}%`,
                  top: `${feature.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className={`p-2 rounded-full bg-black/60 border-2 border-white/30 ${feature.color}`}>
                  <feature.icon className="h-4 w-4 drop-shadow-lg" />
                </div>
                <span className="text-xs text-white mt-1 font-medium drop-shadow-lg bg-black/40 px-2 py-1 rounded">{feature.name}</span>
              </div>
            ))}

            {/* Team markers */}
            {teamsWithProgress.map((team, index) => {
              // Calculate position along the diagonal route path
              const progress = Math.min(team.progress / 85, 1); // Normalize to 0-1
              
              // Smooth diagonal path from bottom left (10,85) to top right (90,15)
              const startX = 10, startY = 85;
              const endX = 90, endY = 15;
              
              // Calculate position with subtle curve for natural movement
              const pathX = startX + (endX - startX) * progress + Math.sin(progress * Math.PI) * 3;
              const pathY = startY + (endY - startY) * progress + Math.cos(progress * Math.PI) * 2;
              
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

          {/* Team leaderboard */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamsWithProgress.map((team) => (
              <div 
                key={team.id} 
                className="bg-tactical-gray rounded-lg p-4 border border-tactical-gray cursor-pointer hover:bg-tactical-gray-light transition-colors"
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
                    style={{ width: `${(team.progress / 85) * 100}%` }}
                  />
                </div>
                
                <div className="text-sm text-gray-400">
                  {Math.round(team.progress)}% complete
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
  );
}
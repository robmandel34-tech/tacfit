import { useMemo } from "react";
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
    { position: 5, icon: Flag, name: "Base Camp", color: "text-green-600" },
    { position: 20, icon: Mountain, name: "First Ridge", color: "text-amber-600" },
    { position: 40, icon: MapPin, name: "Supply Drop", color: "text-blue-600" },
    { position: 60, icon: Mountain, name: "Peak Challenge", color: "text-purple-600" },
    { position: 80, icon: MapPin, name: "Final Push", color: "text-orange-600" },
    { position: 95, icon: Trophy, name: "Victory Point", color: "text-yellow-600" }
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
            {/* Alaska Wilderness Satellite Image */}
            <img 
              src="https://cdn.pixabay.com/photo/2017/11/20/07/26/alaska-2964658_1280.jpg" 
              alt="Alaska Wilderness" 
              className="w-full h-full object-cover"
              style={{ filter: 'brightness(0.7) contrast(1.1)' }}
            />
            
            {/* Overlay for better visibility */}
            <div className="absolute inset-0 bg-black/20" />

            {/* Route path */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              <path d="M5,75 Q15,70 25,65 Q35,60 45,70 Q55,80 65,65 Q75,50 85,55 Q92,60 95,65" 
                    stroke="rgba(255,255,255,0.8)" 
                    strokeWidth="4" 
                    fill="none"
                    strokeDasharray="8,4" />
              <path d="M5,75 Q15,70 25,65 Q35,60 45,70 Q55,80 65,65 Q75,50 85,55 Q92,60 95,65" 
                    stroke="rgba(255,255,255,0.3)" 
                    strokeWidth="8" 
                    fill="none" />
            </svg>

            {/* Topographical features */}
            {features.map((feature, index) => (
              <div
                key={index}
                className="absolute flex flex-col items-center"
                style={{
                  left: `${feature.position}%`,
                  top: `${60 + Math.sin(index * 0.8) * 15}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className={`p-2 rounded-full bg-black/20 ${feature.color}`}>
                  <feature.icon className="h-4 w-4" />
                </div>
                <span className="text-xs text-white mt-1 font-medium">{feature.name}</span>
              </div>
            ))}

            {/* Team markers */}
            {teamsWithProgress.map((team, index) => {
              // Calculate position along the curved path
              const progress = team.progress / 100;
              const pathX = 5 + progress * 90;
              const pathY = 75 - Math.sin(progress * Math.PI * 1.5) * 15 + (index % 2 === 0 ? -5 : 5);
              
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
                  <div className="relative group">
                    <div className={`w-12 h-12 rounded-full border-4 border-white shadow-2xl flex items-center justify-center ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-amber-600' : 
                      'bg-military-green'
                    }`}>
                      <span className="text-white font-bold text-lg drop-shadow-lg">{team.rank}</span>
                    </div>
                    
                    {/* Team flag */}
                    <div className="absolute -top-3 -right-2 w-8 h-5 bg-military-green rounded-sm shadow-xl border border-white">
                      <div className="w-full h-full bg-gradient-to-r from-military-green to-military-green-light rounded-sm" />
                    </div>
                    
                    {/* Team pulse effect for first place */}
                    {index === 0 && (
                      <div className="absolute inset-0 rounded-full bg-yellow-500 animate-ping opacity-20" />
                    )}
                    
                    {/* Team info tooltip */}
                    <div className="absolute bottom-full mb-3 left-1/2 transform -translate-x-1/2 bg-black/95 text-white px-4 py-3 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 shadow-2xl border border-white/20">
                      <div className="font-semibold text-base text-yellow-400">{team.name}</div>
                      <div className="text-military-green font-bold text-lg">{team.points} points</div>
                      {team.motto && <div className="text-gray-300 italic text-xs mt-1">"{team.motto}"</div>}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/95" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Team leaderboard */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamsWithProgress.map((team) => (
              <div key={team.id} className="bg-tactical-gray rounded-lg p-4 border border-tactical-gray">
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
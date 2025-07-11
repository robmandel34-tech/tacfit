import { useAuthRequired } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Navigation from "@/components/navigation";
import ActivityCard from "@/components/activity-card";
import ProgressMap from "@/components/progress-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Target, Calendar, ChevronDown, MessageSquare, Search, Bell, User } from "lucide-react";
import { useState } from "react";

export default function CompetitionStatus() {
  const { user, isLoading } = useAuthRequired();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("Progress Map");

  // Get user's current team membership
  const { data: userTeamMember } = useQuery({
    queryKey: [`/api/team-members/${user?.id}`],
    enabled: !!user,
  });

  // Get competition details
  const { data: competition } = useQuery({
    queryKey: [`/api/competitions/${userTeamMember?.[0]?.team?.competitionId}`],
    enabled: !!userTeamMember?.[0]?.team?.competitionId,
  });

  // Get all teams in the competition
  const { data: teams = [] } = useQuery({
    queryKey: [`/api/teams/competition/${userTeamMember?.[0]?.team?.competitionId}`],
    enabled: !!userTeamMember?.[0]?.team?.competitionId,
  });

  // Get all activities for the competition
  const { data: activities = [] } = useQuery({
    queryKey: [`/api/activities/competition/${userTeamMember?.[0]?.team?.competitionId}`],
    enabled: !!userTeamMember?.[0]?.team?.competitionId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user || !userTeamMember || userTeamMember.length === 0) {
    return (
      <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
        <div className="text-center">
          <Trophy className="mx-auto h-16 w-16 text-gray-500 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Active Competition</h2>
          <p className="text-gray-400">Join a competition to view status</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2a2a2a] text-white">
      {/* Header */}
      <div className="bg-[#3a3a3a] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
            <span className="text-black font-bold text-lg">W</span>
          </div>
          <h1 className="text-xl font-semibold">Competition</h1>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-[#3a3a3a] px-4 py-2 flex space-x-6 border-b border-gray-600">
        {["Progress Map", "Activities Completed", "Chat"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 px-1 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "text-green-400 border-b-2 border-green-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filter Dropdown */}
      <div className="px-4 py-3 bg-[#3a3a3a]">
        <Button
          variant="outline"
          className="bg-[#4a4a4a] border-gray-600 text-white hover:bg-[#5a5a5a] flex items-center space-x-2"
        >
          <span>Everything</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Admin Section */}
      <div className="px-4 py-3 bg-[#2a2a2a] border-b border-gray-600">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-white">withrive admin</div>
            <div className="text-xs text-gray-400">HOST</div>
          </div>
          <div className="w-2 h-2 bg-green-500 rounded-full ml-auto"></div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-[#2a2a2a]">
        {activeTab === "Progress Map" && (
          <div className="px-4 py-4">
            {/* Team Rankings */}
            <div className="space-y-2 mb-6">
              {teams.sort((a: any, b: any) => b.points - a.points).map((team: any, index: number) => (
                <div 
                  key={team.id}
                  className="bg-[#3a3a3a] rounded-lg p-4 flex items-center justify-between cursor-pointer hover:bg-[#4a4a4a] transition-colors"
                  onClick={() => navigate(`/team/${team.id}`)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-white font-bold text-lg">{team.name.toUpperCase()}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                    index === 0 ? 'bg-yellow-600 text-black' :
                    index === 1 ? 'bg-gray-500 text-white' :
                    index === 2 ? 'bg-amber-600 text-black' :
                    'bg-gray-600 text-white'
                  }`}>
                    #{index + 1}
                  </div>
                </div>
              ))}
            </div>

            {/* Satellite Map */}
            <div className="relative">
              <div className="w-full h-96 bg-cover bg-center rounded-lg overflow-hidden relative"
                   style={{
                     backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><filter id="roughen"><feTurbulence baseFrequency="0.04" numOctaves="3" result="noise" seed="2"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="8"/></filter><radialGradient id="forest" cx="50%" cy="50%" r="50%"><stop offset="0%" style="stop-color:%23213b2a;stop-opacity:1"/><stop offset="100%" style="stop-color:%23142618;stop-opacity:1"/></radialGradient></defs><rect width="400" height="300" fill="%23152b1c"/><rect width="400" height="300" fill="url(%23forest)" opacity="0.7"/><circle cx="80" cy="100" r="25" fill="%23234a34" opacity="0.8"/><circle cx="200" cy="80" r="35" fill="%23213b2a" opacity="0.6"/><circle cx="320" cy="120" r="30" fill="%23234a34" opacity="0.7"/><circle cx="150" cy="200" r="40" fill="%23213b2a" opacity="0.5"/><circle cx="280" cy="220" r="28" fill="%23234a34" opacity="0.6"/><path d="M0,150 Q50,140 100,160 Q150,180 200,140 Q250,100 300,120 Q350,140 400,130" stroke="%23305c42" stroke-width="8" fill="none" opacity="0.4"/><path d="M0,180 Q60,170 120,190 Q180,210 240,170 Q300,130 360,150 Q380,160 400,155" stroke="%23305c42" stroke-width="6" fill="none" opacity="0.3"/></svg>')`
                   }}>
                
                {/* Route Path */}
                <svg className="absolute inset-0 w-full h-full">
                  <path
                    d="M 30 280 Q 80 250 130 270 Q 180 290 230 250 Q 280 210 330 230 Q 360 240 380 235"
                    stroke="rgba(255,255,255,0.8)"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray="8,4"
                  />
                  {/* Connection dots */}
                  <circle cx="30" cy="280" r="4" fill="rgba(255,255,255,0.9)" />
                  <circle cx="130" cy="270" r="3" fill="rgba(255,255,255,0.8)" />
                  <circle cx="230" cy="250" r="3" fill="rgba(255,255,255,0.8)" />
                  <circle cx="330" cy="230" r="3" fill="rgba(255,255,255,0.8)" />
                  <circle cx="380" cy="235" r="4" fill="rgba(255,255,255,0.9)" />
                </svg>

                {/* Team Markers */}
                {teams.sort((a: any, b: any) => b.points - a.points).map((team: any, index: number) => {
                  const maxPoints = Math.max(...teams.map((t: any) => t.points), 1);
                  const progress = Math.min((team.points / maxPoints) * 100, 95);
                  
                  // Calculate position along the path
                  const pathPoints = [
                    { x: 30, y: 280 },
                    { x: 130, y: 270 },
                    { x: 230, y: 250 },
                    { x: 330, y: 230 },
                    { x: 380, y: 235 }
                  ];
                  
                  const segmentLength = 100 / (pathPoints.length - 1);
                  const segmentIndex = Math.floor(progress / segmentLength);
                  const segmentProgress = (progress % segmentLength) / segmentLength;
                  
                  const currentPoint = pathPoints[Math.min(segmentIndex, pathPoints.length - 2)];
                  const nextPoint = pathPoints[Math.min(segmentIndex + 1, pathPoints.length - 1)];
                  
                  const x = currentPoint.x + (nextPoint.x - currentPoint.x) * segmentProgress;
                  const y = currentPoint.y + (nextPoint.y - currentPoint.y) * segmentProgress;
                  
                  return (
                    <div
                      key={team.id}
                      className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group"
                      style={{ left: `${x}px`, top: `${y}px` }}
                      onClick={() => navigate(`/team/${team.id}`)}
                    >
                      <div className="w-10 h-10 bg-white rounded-full border-3 border-gray-800 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                        <span className="text-black font-bold text-sm">{index + 1}</span>
                      </div>
                      {/* Team name tooltip */}
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        {team.name}
                      </div>
                    </div>
                  );
                })}

                {/* Finish Line */}
                <div className="absolute top-4 right-4">
                  <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-yellow-300 shadow-lg">
                    <Trophy className="h-5 w-5 text-black" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Activities Completed" && (
          <div className="px-4 py-4">
            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                  <p className="text-gray-400">No activities submitted yet</p>
                </div>
              ) : (
                activities.map((activity: any) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "Chat" && (
          <div className="px-4 py-4">
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-500 mb-4" />
              <p className="text-gray-400">Competition chat coming soon</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-[#3a3a3a] px-4 py-2 flex justify-around items-center border-t border-gray-600">
        <button className="p-2">
          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
            <span className="text-black font-bold text-xs">W</span>
          </div>
        </button>
        <button className="p-2">
          <MessageSquare className="h-6 w-6 text-gray-400" />
        </button>
        <button className="p-2">
          <Search className="h-6 w-6 text-gray-400" />
        </button>
        <button className="p-2 relative">
          <Bell className="h-6 w-6 text-gray-400" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">5</span>
          </div>
        </button>
        <button className="p-2">
          <User className="h-6 w-6 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
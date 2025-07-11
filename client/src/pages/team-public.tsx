import { useAuthRequired } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import Navigation from "@/components/navigation";
import ActivityCard from "@/components/activity-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Crown, Target, Camera, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TeamPublic() {
  const { user, isLoading } = useAuthRequired();
  const { teamId } = useParams();
  const [, navigate] = useLocation();

  // Get team details
  const { data: team } = useQuery({
    queryKey: [`/api/teams/${teamId}`],
    enabled: !!teamId,
  });

  // Get all team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: [`/api/team-members/team/${teamId}`],
    enabled: !!teamId,
  });

  // Get team activities
  const { data: teamActivities = [] } = useQuery({
    queryKey: [`/api/activities/team/${teamId}`],
    enabled: !!teamId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user || !team) {
    return (
      <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
        <div className="text-center">
          <Users className="mx-auto h-16 w-16 text-gray-500 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Team Not Found</h2>
          <p className="text-gray-400">The team you're looking for doesn't exist</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tactical-gray pb-20">
      <Navigation />
      
      <main className="container mx-auto px-4 py-6">
        {/* Back Button */}
        <Button 
          onClick={() => navigate(-1)}
          variant="ghost"
          className="mb-4 text-white hover:bg-tactical-gray-light"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Team Header */}
        <Card className="mb-6 sharp-card bg-tactical-gray-light border-tactical-gray">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center">
                <Users className="mr-2 h-5 w-5" />
                {team.name}
              </CardTitle>
              <div className="flex items-center">
                <Target className="mr-1 h-4 w-4 text-military-green" />
                <span className="text-military-green font-bold">{team.points} points</span>
              </div>
            </div>
            {team.motto && (
              <p className="text-gray-300 italic mt-2">"{team.motto}"</p>
            )}
          </CardHeader>
          <CardContent>
            {/* Team Picture */}
            {team.pictureUrl ? (
              <div className="mb-4">
                <img 
                  src={team.pictureUrl} 
                  alt={`${team.name} team photo`}
                  className="w-full h-48 object-cover rounded-sm"
                />
              </div>
            ) : (
              <div className="mb-4 w-full h-48 bg-tactical-gray rounded-sm flex items-center justify-center">
                <div className="text-center">
                  <Camera className="mx-auto h-12 w-12 text-gray-500 mb-2" />
                  <p className="text-gray-400">No team photo uploaded</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card className="mb-6 sharp-card bg-tactical-gray-light border-tactical-gray">
          <CardHeader>
            <CardTitle className="text-white">Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamMembers.map((member: any) => (
                <div key={member.id} className="bg-tactical-gray p-4 rounded-sm">
                  <div className="flex items-center space-x-3">
                    <Avatar 
                      className="h-12 w-12 cursor-pointer hover:ring-2 hover:ring-military-green transition-all"
                      onClick={() => navigate(`/profile/${member.user?.id}`)}
                    >
                      <AvatarImage src={member.user?.avatar} />
                      <AvatarFallback className="bg-military-green text-white">
                        {member.user?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 
                          className="font-medium text-white cursor-pointer hover:text-military-green transition-colors"
                          onClick={() => navigate(`/profile/${member.user?.id}`)}
                        >
                          {member.user?.username}
                        </h3>
                        {member.role === 'captain' && (
                          <Crown className="ml-2 h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-400 capitalize">{member.role}</p>
                      <p className="text-sm text-military-green">{member.user?.points || 0} points</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Activities */}
        <Card className="sharp-card bg-tactical-gray-light border-tactical-gray">
          <CardHeader>
            <CardTitle className="text-white">Team Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamActivities.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                  <p className="text-gray-400">No team activities yet</p>
                  <p className="text-sm text-gray-500">Team activities will appear here once members start logging workouts</p>
                </div>
              ) : (
                teamActivities.map((activity: any) => (
                  <ActivityCard 
                    key={activity.id} 
                    activity={activity}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
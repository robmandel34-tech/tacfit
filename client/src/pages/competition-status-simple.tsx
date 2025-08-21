import { useAuthRequired } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Target, Calendar } from "lucide-react";

export default function CompetitionStatusSimple() {
  const { user, isLoading } = useAuthRequired();
  const [, navigate] = useLocation();

  // Get user's current team membership
  const { data: userTeamMember } = useQuery({
    queryKey: [`/api/team-members/${user?.id}`],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Get competition details
  const { data: competition } = useQuery({
    queryKey: [`/api/competitions/${userTeamMember?.[0]?.team?.competitionId}`],
    enabled: !!userTeamMember?.[0]?.team?.competitionId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-military-green"></div>
      </div>
    );
  }

  if (!userTeamMember || userTeamMember.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="text-heading">No Active Competition</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 mb-4">You are not currently participating in any competition.</p>
              <button
                onClick={() => navigate("/competitions")}
                className="bg-military-green hover:bg-military-green-light text-white px-4 py-2 rounded"
              >
                Browse Competitions
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Competition Header */}
          <Card className="card-modern">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-military-green" />
                <CardTitle className="text-heading text-xl">
                  {competition?.name || "Competition"}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">Team Competition</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">Active Status</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">In Progress</span>
                </div>
              </div>
              {competition?.description && (
                <p className="text-gray-300 mt-4">{competition.description}</p>
              )}
            </CardContent>
          </Card>

          {/* Team Info */}
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="text-heading">Your Team</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-military-green rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {userTeamMember[0]?.team?.name || "Your Team"}
                  </h3>
                  <p className="text-sm text-gray-400">
                    Role: {userTeamMember[0]?.role || "Member"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="card-modern hover:bg-gray-800 cursor-pointer" onClick={() => navigate("/team")}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-military-green" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Team Details</h3>
                    <p className="text-sm text-gray-400">View team members and progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-modern hover:bg-gray-800 cursor-pointer" onClick={() => navigate("/activity-feed")}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Target className="w-8 h-8 text-military-green" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Activity Feed</h3>
                    <p className="text-sm text-gray-400">View all competition activities</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
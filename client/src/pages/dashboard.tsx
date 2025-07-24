import { useAuthRequired } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";
import Navigation from "@/components/navigation";
import ActivityCard from "@/components/activity-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users } from "lucide-react";

export default function Dashboard() {
  const { user, isLoading } = useAuthRequired();
  const [, navigate] = useLocation();

  // Redirect to onboarding if user hasn't completed it
  useEffect(() => {
    if (user && !user.onboardingCompleted) {
      navigate("/onboarding");
    }
  }, [user, navigate]);

  const { data: activities = [] } = useQuery({
    queryKey: ["/api/activities"],
    enabled: !!user,
    select: (data: any[]) => {
      // Sort activities by creation date (newest first)
      return data.sort((a: any, b: any) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }
  });

  const { data: userTeamMembership } = useQuery({
    queryKey: [`/api/team-members/${user?.id}`],
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>;
  }

  if (!user) return null;

  const hasJoinedCompetition = Array.isArray(userTeamMembership) && userTeamMembership.length > 0;

  return (
    <div className="min-h-screen bg-tactical-gray">
      <Navigation />
      
      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-military-green-dark to-military-green tile-card-elevated p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Activity Feed</h1>
                <p className="text-gray-200 text-lg">Live updates from all tactical operations</p>
              </div>
              <div className="hidden md:block">
                <Activity className="text-6xl text-military-green-light" />
              </div>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="max-w-2xl mx-auto">
          {activities.length === 0 ? (
            <Card className="tile-card">
              <CardContent className="py-16">
                <div className="text-center">
                  <Users className="mx-auto h-16 w-16 text-gray-500 mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Activity Yet</h3>
                  <p className="text-gray-400 mb-6">Be the first to submit an activity and start the action!</p>
                  {!hasJoinedCompetition && (
                    <div className="text-sm text-gray-500 bg-surface-overlay px-4 py-2 rounded-lg inline-block">
                      Join a competition to start submitting activities
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {activities.map((activity: any) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  showFlagButton={false}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
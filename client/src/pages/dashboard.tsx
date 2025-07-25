import { useAuthRequired } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import ActivityCard from "@/components/activity-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingWalkthrough } from "@/components/onboarding-walkthrough";
import { Activity, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { user, isLoading } = useAuthRequired();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showOnboarding, setShowOnboarding] = useState(false);

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

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not found");
      return apiRequest("PATCH", `/api/users/${user.id}/onboarding`, {});
    },
    onSuccess: () => {
      toast({
        title: "Welcome to TacFit!",
        description: "You're now ready to start your tactical fitness journey.",
      });
      // Refresh user data to update onboarding status
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Show onboarding to new users who haven't completed it
  useEffect(() => {
    if (user && !user.onboardingCompleted) {
      setShowOnboarding(true);
    }
  }, [user]);

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
        {/* Compact Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="h-6 w-6 text-military-green" />
              <h1 className="text-2xl font-bold text-white">Intel Feed</h1>
            </div>
            <div className="text-gray-400 text-sm">
              Live updates from all competitions
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

      {/* Onboarding Walkthrough */}
      <OnboardingWalkthrough
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => completeOnboardingMutation.mutate()}
      />
    </div>
  );
}
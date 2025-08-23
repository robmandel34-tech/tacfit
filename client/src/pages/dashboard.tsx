import { useAuthRequired } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import ActivityCard from "@/components/activity-card";
import AdminPostCard from "@/components/admin-post-card";
import AdvertisementCard from "@/components/advertisement-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingWalkthrough } from "@/components/onboarding-walkthrough";
import { Activity, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";

export default function Dashboard() {
  const { user, isLoading } = useAuthRequired();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Pull to refresh functionality
  const { containerRef, RefreshIndicator } = usePullToRefresh({
    queryKeys: [
      ["/api/activities"],
      ["/api/admin-posts/active"],
      ["/api/advertisements/active"],
      [`/api/team-members/${user?.id}`]
    ]
  });

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

  const { data: adminPosts = [] } = useQuery({
    queryKey: ["/api/admin-posts/active"],
    enabled: !!user,
    select: (data: any[]) => {
      // Filter active posts and sort by creation date (newest first)
      return data
        .filter((post: any) => post.isActive)
        .sort((a: any, b: any) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }
  });

  const { data: advertisements = [] } = useQuery({
    queryKey: ["/api/advertisements/active"],
    enabled: !!user,
    select: (data: any[]) => {
      // Sort advertisements by creation date (newest first)
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
    if (user && (user as any).onboardingCompleted === false) {
      setShowOnboarding(true);
    }
    
    // Check for Strava connection success
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('strava_success')) {
      toast({
        title: "Strava Connected!",
        description: "Your Strava account has been successfully connected.",
      });
      
      // Refresh Strava status
      queryClient.invalidateQueries({ queryKey: ["/api/strava/status"] });
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (urlParams.get('strava_error')) {
      const error = urlParams.get('strava_error');
      const errorDetails = urlParams.get('details');
      
      let title = "Strava Connection Failed";
      let description = "There was an issue connecting to Strava. Please try again.";
      
      // Provide specific error messages based on error type
      switch (error) {
        case 'domain_not_configured':
          title = "Domain Configuration Required";
          description = "This app's domain needs to be added to your Strava app settings. Contact the app administrator.";
          break;
        case 'authorization_expired':
          title = "Authorization Expired";
          description = "The authorization request has expired. Please try connecting to Strava again.";
          break;
        case 'invalid_app_config':
          title = "App Configuration Error";
          description = "There's an issue with the Strava app configuration. Contact the app administrator.";
          break;
        case 'domain_detection_failed':
          title = "Connection Error";
          description = "Unable to determine the correct callback URL. Please try again or contact support.";
          break;
        case 'connection_failed':
        default:
          title = "Connection Failed";
          description = "Failed to connect to Strava. Please check your internet connection and try again.";
          break;
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user, toast, queryClient]);



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
      <RefreshIndicator />
      
      <main ref={containerRef} className="container mx-auto px-4 py-6 overflow-y-auto" style={{ minHeight: 'calc(100vh - 64px)' }}>
        {/* Header Card */}
        <Card className="bg-gradient-to-r from-military-green-dark to-military-green border-military-green/30 mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Activity className="h-6 w-6 text-white" />
                <CardTitle className="text-white text-2xl">Intel Feed</CardTitle>
              </div>
              <div className="text-gray-200 text-sm">
                Live updates from all competitions
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Activity Feed */}
        <div className="max-w-2xl mx-auto">
          {(() => {
            // Combine all content types into a unified timeline
            const timelineItems: Array<{ 
              type: 'admin-post' | 'advertisement' | 'activity';
              data: any;
              createdAt: string;
            }> = [
              ...adminPosts.map((post: any) => ({
                type: 'admin-post' as const,
                data: post,
                createdAt: post.createdAt
              })),
              ...advertisements.map((ad: any) => ({
                type: 'advertisement' as const,
                data: ad,
                createdAt: ad.createdAt
              })),
              ...activities.map((activity: any) => ({
                type: 'activity' as const,
                data: activity,
                createdAt: activity.createdAt
              }))
            ];

            // Sort all items by creation date (newest first)
            const sortedTimeline = timelineItems.sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            // Show empty state if no content exists
            if (sortedTimeline.length === 0) {
              return (
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
              );
            }

            // Render the mixed timeline
            return (
              <div className="space-y-6">
                {sortedTimeline.map((item, index) => {
                  switch (item.type) {
                    case 'admin-post':
                      return <AdminPostCard key={`admin-${item.data.id}`} post={item.data} />;
                    case 'advertisement':
                      return <AdvertisementCard key={`ad-${item.data.id}`} advertisement={item.data} />;
                    case 'activity':
                      return (
                        <ActivityCard
                          key={`activity-${item.data.id}`}
                          activity={item.data}
                          showFlagButton={false}
                        />
                      );
                    default:
                      return null;
                  }
                })}
                
                {/* Show message for user activities if only admin content exists */}
                {activities.length === 0 && (adminPosts.length > 0 || advertisements.length > 0) && (
                  <Card className="tile-card">
                    <CardContent className="py-8">
                      <div className="text-center">
                        <Users className="mx-auto h-12 w-12 text-gray-500 mb-3" />
                        <h3 className="text-lg font-semibold text-white mb-2">No User Activities Yet</h3>
                        <p className="text-gray-400 mb-4">Be the first to submit an activity!</p>
                        {!hasJoinedCompetition && (
                          <div className="text-sm text-gray-500 bg-surface-overlay px-4 py-2 rounded-lg inline-block">
                            Join a competition to start submitting activities
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}
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
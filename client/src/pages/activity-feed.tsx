import { useAuthRequired } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, MessageCircle, Flag, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ActivityFeed() {
  const { user, isLoading } = useAuthRequired();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: activities = [] } = useQuery({
    queryKey: ["/api/activities"],
    enabled: !!user,
  });

  const likeActivity = useMutation({
    mutationFn: async (activityId: number) => {
      const response = await fetch(`/api/activities/${activityId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
  });

  const flagActivity = useMutation({
    mutationFn: async (activityId: number) => {
      const response = await fetch(`/api/activities/${activityId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFlagged: true }),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Activity flagged",
        description: "Thank you for reporting this activity.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
  });

  if (isLoading) {
    return <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>;
  }

  if (!user) return null;

  const getInitials = (username: string) => {
    return username.split(' ').map(word => word[0]).join('').toUpperCase() || username.slice(0, 2).toUpperCase();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'cardio':
        return '🏃';
      case 'strength':
        return '💪';
      case 'flexibility':
        return '🧘';
      case 'sports':
        return '⚽';
      default:
        return '🏋️';
    }
  };

  return (
    <div className="min-h-screen bg-tactical-gray">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-heading mb-3 tracking-tight">Activity Feed</h1>
          <p className="text-body text-lg">See what your team and competitors are up to</p>
        </div>

        <div className="max-w-2xl mx-auto space-y-8">
          {activities.length === 0 ? (
            <div className="text-center py-20">
              <div className="card-modern max-w-md mx-auto">
                <Camera className="mx-auto h-20 w-20 text-muted mb-6" />
                <h2 className="text-2xl font-bold text-heading mb-4">No Activities Yet</h2>
                <p className="text-body">Start by submitting your first activity!</p>
              </div>
            </div>
          ) : (
            activities.map((activity: any) => (
              <Card key={activity.id} className="card-modern">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-14 h-14 bg-military-green rounded-full flex items-center justify-center flex-shrink-0 border-2 border-border-subtle">
                      <span className="text-white font-bold text-sm">
                        {getInitials(activity.user?.username || "U")}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className="text-heading font-semibold">{activity.user?.username || "Unknown"}</span>
                        <Badge variant="outline" className="text-xs bg-surface-overlay border-border-subtle">
                          {getActivityIcon(activity.type)} {activity.type}
                        </Badge>
                        <span className="text-muted text-sm">
                          {new Date(activity.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {activity.evidenceUrl && (
                        <div className="mb-4">
                          <img 
                            src={activity.evidenceUrl} 
                            alt="Activity evidence" 
                            className="w-full max-w-md h-48 object-cover rounded-lg border border-border-subtle shadow-soft"
                          />
                        </div>
                      )}
                      
                      <p className="text-body text-sm mb-4">{activity.description}</p>
                      
                      <div className="flex items-center space-x-6">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => likeActivity.mutate(activity.id)}
                          className="text-muted hover:text-military-green transition-colors duration-200 p-2"
                        >
                          <ThumbsUp className="mr-2 h-4 w-4" />
                          {activity.likesCount || 0}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted hover:text-secondary transition-colors duration-200 p-2"
                        >
                          <MessageCircle className="mr-2 h-4 w-4" />
                          {activity.commentsCount || 0}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => flagActivity.mutate(activity.id)}
                          className="text-muted hover:text-red-400 transition-colors duration-200 p-2"
                        >
                          <Flag className="mr-2 h-4 w-4" />
                          Flag
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

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
      
      <main className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Activity Feed</h1>
          <p className="text-gray-300">See what your team and competitors are up to</p>
        </div>

        <div className="w-full max-w-2xl mx-auto">
          {activities.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-tactical-gray-light p-8 rounded-lg border border-tactical-gray-lighter">
                <Camera className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">No Activities Yet</h2>
                <p className="text-gray-400">Start by submitting your first activity!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {activities.map((activity: any) => (
                <div key={activity.id} className="bg-tactical-gray-light border border-tactical-gray-lighter rounded-lg overflow-hidden">
                  <div className="p-6">
                    <div className="mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-military-green rounded-full flex items-center justify-center shrink-0">
                          <span className="text-white font-bold text-xs">
                            {getInitials(activity.user?.username || "U")}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-semibold text-sm">{activity.user?.username || "Unknown"}</span>
                            <span className="text-xs border border-gray-600 text-gray-300 bg-transparent px-2 py-1 rounded">
                              {getActivityIcon(activity.type)} {activity.type}
                            </span>
                            <span className="text-gray-400 text-xs">
                              {new Date(activity.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      {activity.evidenceUrl && (
                        <div className="mb-4">
                          <img 
                            src={activity.evidenceUrl} 
                            alt="Activity evidence" 
                            className="w-full max-w-lg h-48 object-cover rounded-lg border border-gray-600"
                          />
                        </div>
                      )}
                      
                      <p className="text-gray-300 text-sm">{activity.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-4 pt-2 border-t border-gray-600">
                      <button
                        onClick={() => likeActivity.mutate(activity.id)}
                        className="flex items-center gap-2 text-gray-400 hover:text-military-green transition-colors text-sm py-2"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        <span>{activity.likesCount || 0}</span>
                      </button>
                      
                      <button className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors text-sm py-2">
                        <MessageCircle className="h-4 w-4" />
                        <span>{activity.commentsCount || 0}</span>
                      </button>
                      
                      <button
                        onClick={() => flagActivity.mutate(activity.id)}
                        className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-sm py-2"
                      >
                        <Flag className="h-4 w-4" />
                        <span>Flag</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

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

        <div className="max-w-2xl mx-auto space-y-6">
          {activities.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-tactical-gray-light p-8 rounded-lg border border-tactical-gray-lighter">
                <Camera className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">No Activities Yet</h2>
                <p className="text-gray-400">Start by submitting your first activity!</p>
              </div>
            </div>
          ) : (
            activities.map((activity: any) => (
              <div key={activity.id} className="bg-tactical-gray-light border border-tactical-gray-lighter rounded-lg p-6 w-full">
                <div className="flex flex-col w-full">
                  {/* Header row with user info */}
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-military-green rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">
                        {getInitials(activity.user?.username || "U")}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-semibold text-sm">{activity.user?.username || "Unknown"}</span>
                        <Badge variant="outline" className="text-xs border-gray-600 text-gray-300 bg-transparent">
                          {getActivityIcon(activity.type)} {activity.type}
                        </Badge>
                        <span className="text-gray-400 text-xs">
                          {new Date(activity.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="w-full">
                    {activity.evidenceUrl && (
                      <div className="mb-4">
                        <img 
                          src={activity.evidenceUrl} 
                          alt="Activity evidence" 
                          className="w-full max-w-lg h-48 object-cover rounded-lg border border-gray-600"
                        />
                      </div>
                    )}
                    
                    <p className="text-gray-300 text-sm mb-4">{activity.description}</p>
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => likeActivity.mutate(activity.id)}
                        className="flex items-center space-x-2 text-gray-400 hover:text-military-green transition-colors text-sm"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        <span>{activity.likesCount || 0}</span>
                      </button>
                      
                      <button className="flex items-center space-x-2 text-gray-400 hover:text-blue-400 transition-colors text-sm">
                        <MessageCircle className="h-4 w-4" />
                        <span>{activity.commentsCount || 0}</span>
                      </button>
                      
                      <button
                        onClick={() => flagActivity.mutate(activity.id)}
                        className="flex items-center space-x-2 text-gray-400 hover:text-red-400 transition-colors text-sm"
                      >
                        <Flag className="h-4 w-4" />
                        <span>Flag</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

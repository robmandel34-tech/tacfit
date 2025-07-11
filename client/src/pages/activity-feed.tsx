import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Navigation from "@/components/navigation";
import { Camera, ThumbsUp, MessageCircle, Flag } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import ActivitySubmissionModal from "@/components/activity-submission-modal";

export default function ActivityFeed() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [forceRefresh, setForceRefresh] = useState(0);
  
  // Force refresh when navigating to this page
  useEffect(() => {
    setForceRefresh(prev => prev + 1);
  }, [location]);

  if (!user) {
    return <div>Please log in to view the activity feed.</div>;
  }

  const { data: activities, isLoading } = useQuery({
    queryKey: ['/api/activities', forceRefresh],
  });

  const likeActivity = useMutation({
    mutationFn: async (activityId: number) => {
      const response = await fetch(`/api/activities/${activityId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to like activity');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
    },
  });

  const flagActivity = useMutation({
    mutationFn: async (activityId: number) => {
      const response = await fetch(`/api/activities/${activityId}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to flag activity');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
    },
  });

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  const getInitials = (username: string) => {
    return username.split(' ').map(word => word[0]).join('').toUpperCase() || username.slice(0, 2).toUpperCase();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'cardio':
        return '🏃';
      case 'strength':
        return '🏋️';
      case 'flexibility':
        return '🧘';
      case 'sports':
        return '⚽';
      default:
        return '🏋️';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-tactical-gray">
        <Navigation />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-16">
            <div className="text-white">Loading activities...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tactical-gray">
      <Navigation />
      
      <main className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Activity Feed</h1>
          <p className="text-gray-300">See what your team and competitors are up to</p>
        </div>

        <div className="w-full max-w-2xl mx-auto">
          {activities?.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-tactical-gray-light p-8 rounded-lg border border-tactical-gray-lighter">
                <Camera className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">No Activities Yet</h2>
                <p className="text-gray-400">Start by submitting your first activity!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {activities?.map((activity: any) => (
                <div key={`${activity.id}-${forceRefresh}`} className="bg-tactical-gray-light border border-tactical-gray-lighter rounded-lg">
                  <div className="p-6">
                    {/* User header */}
                    <div className="mb-4">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-military-green rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-xs">
                            {getInitials(activity.user?.username || "U")}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-white font-semibold text-sm">{activity.user?.username || "Unknown"}</span>
                            <span className="text-gray-400 text-xs">
                              {new Date(activity.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-13">
                        <span className="text-xs border border-gray-600 text-gray-300 bg-transparent px-2 py-1 rounded">
                          {getActivityIcon(activity.type)} {activity.type}
                        </span>
                      </div>
                    </div>
                    
                    {/* Content */}
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
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-6 pt-3 border-t border-gray-600">
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
              ))}
            </div>
          )}
        </div>
      </main>

      <ActivitySubmissionModal 
        isOpen={isSubmitModalOpen} 
        onClose={() => setIsSubmitModalOpen(false)} 
      />
    </div>
  );
}
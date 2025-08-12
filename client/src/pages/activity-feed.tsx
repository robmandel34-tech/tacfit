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
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  
  // Check for highlight parameter in URL
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const highlightActivityId = urlParams.get('highlight');
  
  // Force refresh when navigating to this page
  useEffect(() => {
    setForceRefresh(prev => prev + 1);
    // Force invalidate cache to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
    queryClient.invalidateQueries({ queryKey: ['/api/activity-types'] });
  }, [location]);

  const { data: activities, isLoading } = useQuery({
    queryKey: ['/api/activities', forceRefresh],
    enabled: !!user,
  });

  // Get activity types for display names
  const { data: activityTypes } = useQuery({
    queryKey: ['/api/activity-types'],
    enabled: !!user,
  });

  // Scroll to highlighted activity after data loads
  useEffect(() => {
    if (highlightActivityId && activities && !isLoading) {
      setTimeout(() => {
        const element = document.getElementById(`activity-${highlightActivityId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500); // Small delay to ensure DOM is updated
    }
  }, [highlightActivityId, activities, isLoading]);

  const likeActivity = useMutation({
    mutationFn: async (activityId: number) => {
      const response = await fetch(`/api/activities/${activityId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to approve activity');
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
        throw new Error('Failed to report activity');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
    },
  });

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

  const getActivityTypeDisplayName = (type: string) => {
    if (activityTypes && Array.isArray(activityTypes)) {
      const activityType = activityTypes.find((at: any) => at.name === type);
      if (activityType) {
        return activityType.displayName;
      }
    }
    // Fallback for unknown types
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const isVideoFile = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  if (!user) {
    return <div>Please log in to view the activity feed.</div>;
  }

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
                <div 
                  key={`${activity.id}-${forceRefresh}`} 
                  id={`activity-${activity.id}`}
                  className={`bg-tactical-gray-light border rounded-lg p-6 ${
                    highlightActivityId === activity.id.toString() 
                      ? 'border-yellow-400 shadow-lg shadow-yellow-400/20 ring-2 ring-yellow-400/20' 
                      : 'border-tactical-gray-lighter'
                  }`}
                >
                  
                  {/* User Info Row */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-military-green rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xs">
                        {getInitials(activity.user?.username || "U")}
                      </span>
                    </div>
                    <div>
                      <span className="text-white font-semibold text-sm">{activity.user?.username || "Unknown"}</span>
                      <span className="text-gray-400 text-xs ml-2">
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  {/* Activity Type Badge */}
                  <div className="mb-4">
                    <span className="text-xs border border-gray-600 text-gray-300 bg-transparent px-2 py-1 rounded">
                      {getActivityIcon(activity.type)} {getActivityTypeDisplayName(activity.type)}
                    </span>
                  </div>
                  
                  {/* Content */}
                  <div className="mb-4">
                    {activity.evidenceUrl && (
                      <div className="mb-4">
                        {isVideoFile(activity.evidenceUrl) ? (
                          <video 
                            src={activity.evidenceUrl} 
                            className="w-full max-w-lg h-48 object-cover rounded-lg border border-gray-600"
                            controls
                            preload="metadata"
                          >
                            Your browser does not support the video tag.
                          </video>
                        ) : (
                          <img 
                            src={activity.evidenceUrl} 
                            alt="Activity evidence" 
                            className="w-full max-w-lg h-48 object-cover rounded-lg border border-gray-600"
                          />
                        )}
                      </div>
                    )}
                    
                    <p className="text-gray-300 text-sm">{activity.description}</p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-6 pt-3 border-t border-gray-600">
                    <button
                      onClick={() => likeActivity.mutate(activity.id)}
                      className="flex items-center gap-2 text-gray-400 hover:text-military-green transition-colors text-sm"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      <span>{activity.likesCount || 0}</span>
                    </button>
                    
                    <button className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors text-sm">
                      <MessageCircle className="h-4 w-4" />
                      <span>{activity.commentsCount || 0}</span>
                    </button>
                    
                    <button
                      onClick={() => flagActivity.mutate(activity.id)}
                      className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-sm"
                    >
                      <Flag className="h-4 w-4" />
                      <span>Flag</span>
                    </button>
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
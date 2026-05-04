import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Navigation from "@/components/navigation";
import { Camera, ThumbsUp, MessageCircle, Flag, Trash2, X } from "lucide-react";
import { queryClient, apiRequest, API_BASE, uploadUrl } from "@/lib/queryClient";
import ActivitySubmissionModal from "@/components/activity-submission-modal";
import { useToast } from "@/hooks/use-toast";

export default function ActivityFeed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [forceRefresh, setForceRefresh] = useState(0);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Force refresh when navigating to this page
  useEffect(() => {
    setForceRefresh(prev => prev + 1);
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

  const likeActivity = useMutation({
    mutationFn: async (activityId: number) => {
      const response = await fetch(`${API_BASE}/api/activities/${activityId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: user?.id }),
      });
      if (!response.ok) throw new Error('Failed to approve activity');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
    },
  });

  const flagActivity = useMutation({
    mutationFn: async (activityId: number) => {
      const response = await fetch(`${API_BASE}/api/activities/${activityId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: user?.id }),
      });
      if (!response.ok) throw new Error('Failed to report activity');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
    },
  });

  const deleteActivity = useMutation({
    mutationFn: async (activityId: number) => {
      return apiRequest("DELETE", `/api/activities/${activityId}`);
    },
    onSuccess: () => {
      toast({
        title: "Activity deleted successfully",
        description: "Points have been deducted from user and team.",
      });
      setForceRefresh(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities', forceRefresh] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete activity",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const getInitials = (username: string) => {
    return username.split(' ').map(word => word[0]).join('').toUpperCase() || username.slice(0, 2).toUpperCase();
  };

  const getActivityIcon = (type: string): string => {
    const icons: Record<string, string> = {
      run: '🏃', trail_run: '🏃', virtual_run: '🏃', cardio: '🏃',
      walk: '🚶', hike: '🥾',
      ride: '🚴', gravel_ride: '🚴', e_bike_ride: '🚴', virtual_ride: '🚴', velomobile: '🚴',
      mountain_bike_ride: '🚵', e_mountain_bike_ride: '🚵',
      swim: '🏊', rowing: '🚣', kayak: '🛶', canoe: '🛶',
      stand_up_paddling: '🏄', surf: '🏄', windsurf: '🏄', kitesurf_session: '🪁', sail: '⛵',
      alpine_ski: '🎿', backcountry_ski: '🎿', nordic_ski: '⛷️',
      snowboard: '🏂', snowshoe: '🥾', ice_skate: '⛸️', inline_skate: '🛼',
      strength: '🏋️', weight_training: '🏋️', crossfit: '💪', workout: '💪',
      elliptical: '🏃', stair_stepper: '🪜', handcycle: '🔄',
      soccer: '⚽', american_football: '🏈', basketball: '🏀',
      baseball: '⚾', softball: '⚾', volleyball: '🏐',
      golf: '⛳', tennis: '🎾', badminton: '🏸', squash: '🏸',
      racquetball: '🏸', pickleball: '🏓', table_tennis: '🏓',
      climbing: '🧗', rock_climbing: '🧗',
      flexibility: '🤸', yoga: '🧘',
      meditation: '🧘', mindfulness: '🧘', body_scan: '🧘',
      breathing_exercises: '🫁', loving_kindness: '💚', sleep_meditation: '😴',
      wheelchair: '♿',
    };
    return icons[type] || '🏃';
  };

  const getActivityTypeDisplayName = (type: string) => {
    if (activityTypes && Array.isArray(activityTypes)) {
      const activityType = activityTypes.find((at: any) => at.name === type);
      if (activityType) return activityType.displayName;
    }
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const isVideoFile = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  // Group activities by type to build bubble counts
  const typeCounts: Record<string, number> = {};
  if (activities && Array.isArray(activities)) {
    (activities as any[]).forEach((a: any) => {
      const t = a.type || 'other';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
  }
  const bubbleTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

  // Filter activities by selected type
  const visibleActivities = (activities && Array.isArray(activities))
    ? (selectedType
        ? (activities as any[]).filter((a: any) => a.type === selectedType)
        : (activities as any[]))
    : [];

  if (!user) {
    return <div>Please log in to view the activity feed.</div>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen backdrop-blur-md bg-white/5">
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
    <div className="min-h-screen backdrop-blur-md bg-white/5">
      <Navigation />
      
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Activity Feed</h1>
          <p className="text-gray-300">See what your team and competitors are up to</p>
        </div>

        {/* Activity Type Bubbles */}
        {bubbleTypes.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 items-center">
              {/* "All" bubble */}
              <button
                onClick={() => setSelectedType(null)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  selectedType === null
                    ? 'bg-[var(--bubble-bg)] border-[var(--bubble-accent)] text-[var(--bubble-accent)] bubble-glow'
                    : 'bg-[var(--bubble-bg)] border-[var(--bubble-accent)]/30 text-[var(--bubble-accent)]/70 hover:border-[var(--bubble-accent)] hover:text-[var(--bubble-accent)] bubble-glow-hover'
                }`}
              >
                All
                <span className="text-xs rounded-full px-1.5 py-0.5 bg-[var(--bubble-accent)]/15 text-[var(--bubble-accent)]">
                  {Array.isArray(activities) ? (activities as any[]).length : 0}
                </span>
              </button>

              {bubbleTypes.map(([type, count]) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(selectedType === type ? null : type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    selectedType === type
                      ? 'bg-[var(--bubble-bg)] border-[var(--bubble-accent)] text-[var(--bubble-accent)] bubble-glow'
                      : 'bg-[var(--bubble-bg)] border-[var(--bubble-accent)]/30 text-[var(--bubble-accent)]/70 hover:border-[var(--bubble-accent)] hover:text-[var(--bubble-accent)] bubble-glow-hover'
                  }`}
                >
                  <span>{getActivityIcon(type)}</span>
                  <span>{getActivityTypeDisplayName(type)}</span>
                  <span className="text-xs rounded-full px-1.5 py-0.5 bg-[var(--bubble-accent)]/15 text-[var(--bubble-accent)]">
                    {count}
                  </span>
                </button>
              ))}

              {/* Clear filter indicator */}
              {selectedType && (
                <button
                  onClick={() => setSelectedType(null)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors ml-1"
                >
                  <X className="h-3 w-3" />
                  Clear filter
                </button>
              )}
            </div>
          </div>
        )}

        <div className="w-full max-w-2xl mx-auto">
          {visibleActivities.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-tactical-gray-light p-8 rounded-lg border border-tactical-gray-lighter">
                <Camera className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">
                  {selectedType ? `No ${getActivityTypeDisplayName(selectedType)} Activities` : 'No Activities Yet'}
                </h2>
                <p className="text-gray-400">
                  {selectedType ? 'Try a different filter or submit an activity!' : 'Start by submitting your first activity!'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {visibleActivities.map((activity: any) => (
                <div key={`${activity.id}-${forceRefresh}`} className="bg-tactical-gray-light border border-tactical-gray-lighter rounded-lg p-6">
                  
                  {/* User Info Row */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-military-green rounded-full flex items-center justify-center text-forest-green">
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
                    <span className="text-xs border border-[var(--bubble-accent)]/40 text-[var(--bubble-accent)] bg-[var(--bubble-bg)] px-2 py-1 rounded-full">
                      {getActivityIcon(activity.type)} {getActivityTypeDisplayName(activity.type)}
                    </span>
                  </div>
                  
                  {/* Content */}
                  <div className="mb-4">
                    {activity.evidenceUrl && (
                      <div className="mb-4">
                        {isVideoFile(activity.evidenceUrl) ? (
                          <video 
                            src={uploadUrl(activity.evidenceUrl)} 
                            className="w-full max-w-lg h-48 object-cover rounded-lg border border-gray-600"
                            controls
                            preload="metadata"
                          >
                            Your browser does not support the video tag.
                          </video>
                        ) : (
                          <img 
                            src={uploadUrl(activity.evidenceUrl)} 
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
                    
                    {user?.isAdmin && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete this activity? This will deduct ${activity.points} points from the user and team. This action cannot be undone.`)) {
                            deleteActivity.mutate(activity.id);
                          }
                        }}
                        disabled={deleteActivity.isPending}
                        className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors text-sm"
                        title="Delete activity (Admin only)"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                      </button>
                    )}
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

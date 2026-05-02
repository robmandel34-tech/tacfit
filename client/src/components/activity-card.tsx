import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ThumbsUp, MessageCircle, Flag, Users, Image, Mountain, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest, uploadUrl, API_BASE } from "@/lib/queryClient";
import { useState } from "react";
import ActivityCommentsModal from "./activity-comments-modal";
import { useToast } from "@/hooks/use-toast";

import { MediaDisplay } from "@/components/media-display";

interface ActivityCardProps {
  activity: {
    id: number;
    type: string;
    description: string;
    quantity?: string;
    textInput?: string; // Add text input field
    evidenceUrl?: string;
    evidenceType?: string; // Add evidence type field (video, photo, etc.)
    imageUrl?: string;
    imageUrls?: string[]; // New field for multiple images
    thumbnailUrl?: string; // Add thumbnailUrl field
    points?: number;
    createdAt: string;

    user: {
      id: number;
      username: string;
      avatar?: string;
    };
    team?: {
      id: number;
      name: string;
    };
    competition?: {
      id: number;
      name: string;
    };
    likesCount: number;
    commentsCount: number;
  };
  onLike?: (id: number) => void;
  onFlag?: (id: number) => void;
  showFlagButton?: boolean; // New prop to control flag button visibility
  onDelete?: () => void; // Callback to trigger parent refresh after deletion
}

export default function ActivityCard({ activity, onLike, onFlag, showFlagButton = true, onDelete }: ActivityCardProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [isTextExpanded, setIsTextExpanded] = useState(false);



  
  // Get activity types for display names
  const { data: activityTypes } = useQuery({
    queryKey: ['/api/activity-types'],
    enabled: !!user,
  });
  
  // Get current likes for this activity
  const { data: activityLikes } = useQuery({
    queryKey: [`/api/activities/${activity.id}/likes`],
    enabled: !!user,
  });

  // Get current comments for this activity
  const { data: activityComments } = useQuery({
    queryKey: [`/api/activities/${activity.id}/comments`],
    enabled: !!user,
  });

  // Get current flags for this activity
  const { data: activityFlags } = useQuery({
    queryKey: [`/api/activities/${activity.id}/flags`],
    enabled: !!user,
  });

  // Check if current user has liked this activity
  const userLikeStatus = Array.isArray(activityLikes) ? activityLikes.some((like: any) => like.userId === user?.id) : false;
  
  // Check if current user has flagged this activity
  const userFlagStatus = Array.isArray(activityFlags) ? activityFlags.some((flag: any) => flag.userId === user?.id) : false;
  
  // Get current counts (use live data if available, fallback to activity prop)
  const currentLikeCount = Array.isArray(activityLikes) ? activityLikes.length : activity.likesCount;
  const currentCommentCount = Array.isArray(activityComments) ? activityComments.length : activity.commentsCount;
  const currentFlagCount = Array.isArray(activityFlags) ? activityFlags.length : 0;
  
  const getInitials = (username: string) => {
    return username.split(' ').map(word => word[0]).join('').toUpperCase() || username.slice(0, 2).toUpperCase();
  };

  const handleProfileClick = () => {
    if (activity.user?.id) navigate(`/profile/${activity.user.id}`);
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
      if (activityType) {
        return activityType.displayName;
      }
    }
    // Fallback for unknown types
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getActivityMeasurement = (type: string) => {
    if (activityTypes && Array.isArray(activityTypes)) {
      const activityType = activityTypes.find((at: any) => at.name === type);
      if (activityType) {
        return activityType.measurementUnit;
      }
    }
    // Fallback for unknown types
    return 'units';
  };

  const isVideoFile = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  // Detect if this is a HealthKit activity
  const isHealthKitActivity = () => {
    return activity.description?.includes('Apple HealthKit') || 
           activity.textInput?.includes('Apple HealthKit') ||
           activity.description?.includes('Note: This activity was tracked by Apple HealthKit');
  };

  // Parse HealthKit stats from description
  const parseHealthKitStats = () => {
    if (!isHealthKitActivity()) return null;
    
    const text = activity.description || '';
    const stats: { [key: string]: string } = {};
    
    // Extract duration
    const durationMatch = text.match(/duration: (\d+)m/);
    if (durationMatch) stats.duration = `${durationMatch[1]} minutes`;
    
    // Extract calories
    const caloriesMatch = text.match(/calories: (\d+)/);
    if (caloriesMatch) stats.calories = `${caloriesMatch[1]} cal`;
    
    // Extract distance
    const distanceMatch = text.match(/distance: ([\d.]+\s*\w+)/);
    if (distanceMatch) stats.distance = distanceMatch[1];
    
    return Object.keys(stats).length > 0 ? stats : null;
  };

  // Get clean description without HealthKit stats
  const getCleanDescription = () => {
    if (!isHealthKitActivity()) return activity.description;
    
    // Remove the HealthKit note and stats, keep just the main description
    let description = activity.description || '';
    
    // Remove the "Note: This activity was tracked by Apple HealthKit..." part
    description = description.replace(/\n\nNote: This activity was tracked by Apple HealthKit[\s\S]*$/, '');
    
    // Remove just the workout type and duration from the beginning if it's redundant
    description = description.replace(/^.+?workout - \d+m\s*/, '');
    
    return description.trim() || `${getActivityTypeDisplayName(activity.type)} workout`;
  };





  const likeActivity = useMutation({
    mutationFn: async (activityId: number) => {
      if (!user) throw new Error('Must be logged in to like activities');
      const response = await fetch(`${API_BASE}/api/activities/${activityId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: user.id }),
      });
      if (!response.ok) throw new Error('Failed to like activity');
      return response.json();
    },
    onMutate: async (activityId) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: [`/api/activities/${activityId}/likes`] });

      // Snapshot the current likes so we can roll back on error
      const previousLikes = queryClient.getQueryData<any[]>([`/api/activities/${activityId}/likes`]);

      // Immediately update the cache — toggle like on/off
      queryClient.setQueryData<any[]>([`/api/activities/${activityId}/likes`], (old) => {
        const current = Array.isArray(old) ? old : [];
        const alreadyLiked = current.some((like: any) => like.userId === user?.id);
        if (alreadyLiked) {
          return current.filter((like: any) => like.userId !== user?.id);
        } else {
          return [...current, { id: Date.now(), activityId, userId: user?.id, createdAt: new Date().toISOString() }];
        }
      });

      return { previousLikes };
    },
    onError: (_err, activityId, context) => {
      // Roll back to the snapshot if the mutation fails
      if (context?.previousLikes !== undefined) {
        queryClient.setQueryData([`/api/activities/${activityId}/likes`], context.previousLikes);
      }
    },
    onSettled: (_data, _error, activityId) => {
      // Always sync with the server once settled (success or error)
      queryClient.invalidateQueries({ queryKey: [`/api/activities/${activityId}/likes`] });
    },
  });

  const flagActivity = useMutation({
    mutationFn: async (activityId: number) => {
      if (!user) throw new Error('Must be logged in to flag activities');
      
      const response = await fetch(`${API_BASE}/api/activities/${activityId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId: user.id }),
      });
      if (!response.ok) {
        throw new Error('Failed to flag activity');
      }
      return response.json();
    },
    onSuccess: () => {
      // Update queries to reflect the new flag status
      queryClient.invalidateQueries({ queryKey: [`/api/activities/${activity.id}/flags`] });
    },
  });

  const deleteActivity = useMutation({
    mutationFn: async (activityId: number) => {
      return apiRequest("DELETE", `/api/activities/${activityId}`);
    },
    onSuccess: () => {
      toast({
        title: "Activity Deleted",
        description: "The activity has been removed successfully.",
      });
      
      // Invalidate all relevant queries to refresh activity feeds
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities/team'] });
      queryClient.invalidateQueries({ queryKey: ['/api/activities/competition'] });
      
      // Call onDelete callback if provided
      if (onDelete) {
        onDelete();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Activity",
        description: error.message || "Could not delete the activity. Please try again.",
        variant: "destructive"
      });
    },
  });

  const handleLike = () => {
    if (onLike) {
      onLike(activity.id);
    } else {
      likeActivity.mutate(activity.id);
    }
  };

  const handleFlag = () => {
    if (onFlag) {
      onFlag(activity.id);
    } else {
      flagActivity.mutate(activity.id);
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this activity? This action cannot be undone.')) {
      deleteActivity.mutate(activity.id);
    }
  };

  return (
    <Card className="tile-card overflow-hidden rounded-2xl">
      <CardContent className="p-0">
        {/* Header with profile info */}
        <div
          className="p-6 pb-4 relative overflow-hidden"
          style={{
            background: 'hsla(97, 40%, 28%, 0.22)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderBottom: '1px solid hsla(97, 40%, 50%, 0.18)',
          }}
        >
          {/* Shield watermark */}
          <div aria-hidden="true" style={{
            position: 'absolute', right: '-6%', top: '50%', transform: 'translateY(-50%)',
            width: '55%', height: '220%', pointerEvents: 'none', zIndex: 0,
            backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzNDAgMzAwIj48cGF0aCBkPSJNMjEwIDE4IEwxNDAgNDggTDE0MCAxNTIgUTE0MCAyMTAgMjEwIDIzNSBRMjgwIDIxMCAyODAgMTUyIEwyODAgNDggWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIiBvcGFjaXR5PSIwLjIwIi8+PHBhdGggZD0iTTE1NSA1IEw4MiAzOCBMODIgMTUwIFE4MiAyMTIgMTU1IDIzOCBRMjI4IDIxMiAyMjggMTUwIEwyMjggMzggWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIiBvcGFjaXR5PSIwLjEzIi8+PHBhdGggZD0iTTI3OCAxMiBMMjA1IDQ1IEwyMDUgMTU4IFEyMDUgMjIwIDI3OCAyNDYgUTM1MSAyMjAgMzUxIDE1OCBMMzUxIDQ1IFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMyIgb3BhY2l0eT0iMC4wOCIvPjwvc3ZnPg==")`,
            backgroundRepeat: 'no-repeat', backgroundSize: 'contain', backgroundPosition: 'center right',
          }} />
          <div className="relative" style={{ zIndex: 1 }}>
          <div className="flex gap-4">
            <div className="flex flex-col items-center gap-1">
              {activity.team && (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Users className="h-3 w-3" />
                  <span className="text-center">{activity.team.name}</span>
                </div>
              )}
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleProfileClick}
              >
                {activity.user?.avatar ? (
                  <img
                    src={uploadUrl(activity.user.avatar)}
                    alt="Profile picture"
                    className="w-12 h-12 rounded-full object-cover"
                    onError={(e) => {
                      console.error("Activity user avatar failed to load:", activity.user.avatar);
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                    onLoad={() => {
                      console.log("Activity user avatar loaded successfully:", activity.user.avatar);
                    }}
                  />
                ) : null}
                <div className="w-12 h-12 bg-gradient-to-b from-military-green to-[#1a2e1a] rounded-full flex items-center justify-center hover:opacity-80 transition-opacity overflow-hidden" style={{ display: activity.user?.avatar ? 'none' : 'flex' }}>
                  <svg viewBox="0 0 40 40" className="w-12 h-12" fill="none">
                    <ellipse cx="20" cy="11" rx="8" ry="5" fill="rgba(255,255,255,0.85)" />
                    <rect x="12" y="15" width="16" height="2" rx="1" fill="rgba(255,255,255,0.85)" />
                    <ellipse cx="20" cy="20" rx="5" ry="5" fill="rgba(255,255,255,0.85)" />
                    <path d="M9 40 Q9 29 11 27 L15 26 Q18 28 20 28 Q22 28 25 26 L29 27 Q31 29 31 40 Z" fill="rgba(255,255,255,0.85)" />
                  </svg>
                </div>
              </div>
              <span 
                className="text-white text-sm font-medium cursor-pointer hover:text-military-green transition-colors text-center"
                onClick={handleProfileClick}
              >
                {activity.user?.username || 'Unknown'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="outline" className="text-xs border-[var(--bubble-accent)]/40 text-[var(--bubble-accent)] bg-[var(--bubble-bg)] whitespace-nowrap">
                  {getActivityIcon(activity.type)} {getActivityTypeDisplayName(activity.type)}
                </Badge>

              </div>
              {isHealthKitActivity() ? (
                <div className="space-y-3">
                  {/* HealthKit Label */}
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[var(--bubble-bg)] text-[var(--bubble-accent)] border-[var(--bubble-accent)]/40 hover:bg-[var(--bubble-bg)]/80 text-xs px-2 py-1">
                      🍎 Apple HealthKit
                    </Badge>
                  </div>
                  
                  {/* Clean Description */}
                  <p className="text-gray-300 text-sm">
                    {getCleanDescription()}
                  </p>
                  
                  {/* HealthKit Stats Grid */}
                  {(() => {
                    const stats = parseHealthKitStats();
                    return stats ? (
                      <div className="bg-tactical-gray-lighter rounded-lg p-3 border border-gray-600">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          {stats.duration && (
                            <div>
                              <p className="text-gray-400 text-xs uppercase tracking-wide">Duration</p>
                              <p className="text-green-400 font-semibold text-sm">{stats.duration}</p>
                            </div>
                          )}
                          {stats.calories && (
                            <div>
                              <p className="text-gray-400 text-xs uppercase tracking-wide">Calories</p>
                              <p className="text-orange-400 font-semibold text-sm">{stats.calories}</p>
                            </div>
                          )}
                          {stats.distance && (
                            <div>
                              <p className="text-gray-400 text-xs uppercase tracking-wide">Distance</p>
                              <p className="text-blue-400 font-semibold text-sm">{stats.distance}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null;
                  })()
                  }
                </div>
              ) : (
                <p className="text-gray-300 text-sm">
                  {activity.quantity && (
                    <span className="font-medium text-white">
                      {activity.quantity} {getActivityMeasurement(activity.type)}
                    </span>
                  )}
                  {activity.quantity && activity.description && ' - '}
                  {activity.description}
                </p>
              )}
              {activity.competition && (
                <p className="text-xs text-military-green mt-1 flex items-center gap-1">
                  <Mountain className="h-3 w-3" />
                  {activity.competition.name}
                </p>
              )}
            </div>
          </div>
          </div>
        </div>
        
        {/* Full-width media slideshow */}
        {(activity.evidenceUrl || activity.imageUrl || (activity.imageUrls && activity.imageUrls.length > 0)) && (
          <div className="mb-0 border-t border-b border-gray-600">

            <MediaDisplay 
              imageUrls={
                activity.imageUrls && activity.imageUrls.length > 0 
                  ? activity.imageUrls 
                  : activity.imageUrl 
                    ? [activity.imageUrl]
                    : activity.evidenceUrl && !isVideoFile(activity.evidenceUrl)
                      ? [activity.evidenceUrl]
                      : []
              }
              videoUrl={activity.evidenceUrl && isVideoFile(activity.evidenceUrl) ? activity.evidenceUrl : undefined}
              thumbnailUrl={activity.thumbnailUrl}
            />
          </div>
        )}
        
        {/* Full-width text input section - hide for HealthKit activities since stats are shown above */}
        {activity.textInput && !isHealthKitActivity() && (
          <div className="px-6 py-4 border-t border-gray-600">
            <div className="p-3 bg-tactical-gray-lighter rounded-lg border border-gray-600">
              <p className="text-gray-300 text-sm leading-relaxed">
                {isTextExpanded 
                  ? activity.textInput 
                  : activity.textInput.length > 150 
                    ? `${activity.textInput.substring(0, 150)}...`
                    : activity.textInput
                }
              </p>
              {activity.textInput.length > 150 && (
                <button 
                  onClick={() => setIsTextExpanded(!isTextExpanded)}
                  className="mt-2 text-military-green hover:text-military-green-light text-xs flex items-center gap-1 transition-colors"
                >
                  {isTextExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Read more
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Full-width action bar */}
        <div
          className="px-6 py-3 relative overflow-hidden"
          style={{
            background: 'hsla(97, 40%, 28%, 0.22)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderTop: '1px solid hsla(97, 40%, 50%, 0.18)',
          }}
        >
          <div aria-hidden="true" style={{
            position: 'absolute', right: '-6%', top: '50%', transform: 'translateY(-50%)',
            width: '55%', height: '400%', pointerEvents: 'none', zIndex: 0,
            backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzNDAgMzAwIj48cGF0aCBkPSJNMjEwIDE4IEwxNDAgNDggTDE0MCAxNTIgUTE0MCAyMTAgMjEwIDIzNSBRMjgwIDIxMCAyODAgMTUyIEwyODAgNDggWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIiBvcGFjaXR5PSIwLjIwIi8+PHBhdGggZD0iTTE1NSA1IEw4MiAzOCBMODIgMTUwIFE4MiAyMTIgMTU1IDIzOCBRMjI4IDIxMiAyMjggMTUwIEwyMjggMzggWiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIiBvcGFjaXR5PSIwLjEzIi8+PHBhdGggZD0iTTI3OCAxMiBMMjA1IDQ1IEwyMDUgMTU4IFEyMDUgMjIwIDI3OCAyNDYgUTM1MSAyMjAgMzUxIDE1OCBMMzUxIDQ1IFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMyIgb3BhY2l0eT0iMC4wOCIvPjwvc3ZnPg==")`,
            backgroundRepeat: 'no-repeat', backgroundSize: 'contain', backgroundPosition: 'center right',
          }} />
          <div className="relative" style={{ zIndex: 1 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLike}
                disabled={likeActivity.isPending}
                className="flex items-center gap-2 transition-colors text-sm text-gray-400 hover:text-military-green"
                style={{
                  color: userLikeStatus ? '#7cb342' : undefined
                }}
              >
                <ThumbsUp 
                  className="h-4 w-4" 
                  style={{
                    fill: userLikeStatus ? '#7cb342' : 'none'
                  }}
                />
                <span>{currentLikeCount}</span>
              </button>
              
              <button 
                onClick={() => setShowComments(true)}
                className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors text-sm"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{currentCommentCount}</span>
              </button>
              
              {showFlagButton && (
                <button
                  onClick={handleFlag}
                  disabled={flagActivity.isPending}
                  className="flex items-center gap-2 transition-colors text-sm text-gray-400 hover:text-red-400"
                  style={{
                    color: userFlagStatus ? '#ef4444' : undefined
                  }}
                >
                  <Flag 
                    className="h-4 w-4" 
                    style={{
                      fill: userFlagStatus ? '#ef4444' : 'none'
                    }}
                  />
                  <span className="text-gray-300">{currentFlagCount > 0 ? currentFlagCount : 'Flag'}</span>
                </button>
              )}

              {/* Admin delete button */}
              {user?.isAdmin && (
                <button
                  onClick={handleDelete}
                  disabled={deleteActivity.isPending}
                  className="flex items-center gap-2 transition-colors text-sm text-gray-400 hover:text-red-500"
                  title="Delete Activity (Admin)"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="text-gray-300">Delete</span>
                </button>
              )}
            </div>
            
            <span className="text-gray-400 text-sm">
              {new Date(activity.createdAt).toLocaleDateString()}
            </span>
          </div>
          </div>
        </div>
      </CardContent>
      
      <ActivityCommentsModal
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        activityId={activity.id}
        activityTitle={activity.description}
      />
      

    </Card>
  );
}

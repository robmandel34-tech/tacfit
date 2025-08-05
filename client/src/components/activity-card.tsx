import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ThumbsUp, MessageCircle, Flag, Users, Image, Mountain, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import ActivityCommentsModal from "./activity-comments-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import { MediaDisplay } from "@/components/media-display";

interface ActivityCardProps {
  activity: {
    id: number;
    type: string;
    description: string;
    quantity?: string;
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
    navigate(`/profile/${activity.user.id}`);
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





  const likeActivity = useMutation({
    mutationFn: async (activityId: number) => {
      if (!user) throw new Error('Must be logged in to like activities');
      
      const response = await fetch(`/api/activities/${activityId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!response.ok) {
        throw new Error('Failed to like activity');
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Update queries to reflect the new like status
      queryClient.invalidateQueries({ queryKey: [`/api/activities/${activity.id}/likes`] });
      // Don't invalidate main activities query to preserve flag state
    },
  });

  const flagActivity = useMutation({
    mutationFn: async (activityId: number) => {
      if (!user) throw new Error('Must be logged in to flag activities');
      
      const response = await fetch(`/api/activities/${activityId}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
    <Card className="tile-card">
      <CardContent className="p-0">
        {/* Header with profile info */}
        <div className="p-6 pb-4">
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
                    src={`/uploads/${activity.user.avatar}`}
                    alt="Profile picture"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-military-green rounded-full flex items-center justify-center hover:bg-military-green-light transition-colors">
                    <span className="text-white font-bold text-sm">
                      {getInitials(activity.user.username)}
                    </span>
                  </div>
                )}
              </div>
              <span 
                className="text-white text-sm font-medium cursor-pointer hover:text-military-green transition-colors text-center"
                onClick={handleProfileClick}
              >
                {activity.user.username}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="outline" className="text-xs border-gray-600 text-gray-300 whitespace-nowrap">
                  {getActivityIcon(activity.type)} {getActivityTypeDisplayName(activity.type)}
                </Badge>

              </div>
              <p className="text-gray-300 text-sm">
                {activity.quantity && (
                  <span className="font-medium text-white">
                    {activity.quantity} {getActivityMeasurement(activity.type)}
                  </span>
                )}
                {activity.quantity && activity.description && ' - '}
                {activity.description}
              </p>
              {activity.competition && (
                <p className="text-xs text-military-green mt-1 flex items-center gap-1">
                  <Mountain className="h-3 w-3" />
                  {activity.competition.name}
                </p>
              )}
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
        
        {/* Full-width action bar */}
        <div className="px-6 py-4 border-t border-gray-600">
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

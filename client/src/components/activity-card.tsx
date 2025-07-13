import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ThumbsUp, MessageCircle, Flag, Users, Image } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import ActivityCommentsModal from "./activity-comments-modal";

interface ActivityCardProps {
  activity: {
    id: number;
    type: string;
    description: string;
    quantity?: string;
    evidenceUrl?: string;
    imageUrl?: string;
    createdAt: string;
    user: {
      id: number;
      username: string;
    };
    team?: {
      id: number;
      name: string;
    };
    likesCount: number;
    commentsCount: number;
  };
  onLike?: (id: number) => void;
  onFlag?: (id: number) => void;
}

export default function ActivityCard({ activity, onLike, onFlag }: ActivityCardProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  
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
  const userLikeStatus = activityLikes?.some((like: any) => like.userId === user?.id);
  
  // Check if current user has flagged this activity
  const userFlagStatus = activityFlags?.some((flag: any) => flag.userId === user?.id);
  
  // Get current counts (use live data if available, fallback to activity prop)
  const currentLikeCount = activityLikes?.length ?? activity.likesCount;
  const currentCommentCount = activityComments?.length ?? activity.commentsCount;
  const currentFlagCount = activityFlags?.length ?? 0;
  
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
    switch (type) {
      case 'cardio':
        return 'Cardio Training';
      case 'strength':
        return 'Strength Operations';
      case 'flexibility':
        return 'Mobility Training';
      case 'sports':
        return 'Combat Sports';
      default:
        return 'Special Operations';
    }
  };

  const getActivityMeasurement = (type: string) => {
    switch (type) {
      case 'cardio':
        return 'minutes';
      case 'strength':
        return 'reps';
      case 'flexibility':
        return 'minutes';
      default:
        return 'units';
    }
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
                {activity.user.avatar ? (
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
            </div>
          </div>
        </div>
        
        {/* Full-width media */}
        {(activity.evidenceUrl || activity.imageUrl) && (
          <div className="mb-0 relative">
            {activity.evidenceUrl && isVideoFile(activity.evidenceUrl) ? (
              <video 
                src={activity.evidenceUrl} 
                className="w-full h-64 object-cover border-t border-b border-gray-600"
                controls
                preload="metadata"
              >
                Your browser does not support the video tag.
              </video>
            ) : activity.evidenceUrl ? (
              <img 
                src={activity.evidenceUrl} 
                alt="Activity evidence" 
                className="w-full h-64 object-cover border-t border-b border-gray-600"
              />
            ) : activity.imageUrl ? (
              <img 
                src={activity.imageUrl} 
                alt="Activity evidence" 
                className="w-full h-64 object-cover border-t border-b border-gray-600"
              />
            ) : null}
            
            {/* Show image icon when both video and image are present */}
            {activity.evidenceUrl && activity.imageUrl && (
              <button
                onClick={() => setShowImageModal(true)}
                className="absolute top-4 right-4 bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
              >
                <Image className="h-4 w-4 text-white" />
              </button>
            )}
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
      
      {/* Image Modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-white">Activity Image</DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-0">
            {activity.imageUrl && (
              <img 
                src={activity.imageUrl} 
                alt="Activity evidence" 
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

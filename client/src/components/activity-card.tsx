import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, MessageCircle, Flag } from "lucide-react";
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
    evidenceUrl?: string;
    createdAt: string;
    user: {
      id: number;
      username: string;
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

  // Check if current user has liked this activity
  const userLikeStatus = activityLikes?.some((like: any) => like.userId === user?.id);
  
  // Get current counts (use live data if available, fallback to activity prop)
  const currentLikeCount = activityLikes?.length ?? activity.likesCount;
  const currentCommentCount = activityComments?.length ?? activity.commentsCount;
  
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
      queryClient.invalidateQueries({ queryKey: ['/api/activities'] });
      queryClient.invalidateQueries({ queryKey: [`/api/activities/${activity.id}/likes`] });
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
    <Card className="bg-tactical-gray-light border-tactical-gray-lighter">
      <CardContent className="p-6">
        <div className="flex gap-4">
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
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <span 
                className="text-white font-semibold cursor-pointer hover:text-military-green transition-colors"
                onClick={handleProfileClick}
              >
                {activity.user.username}
              </span>
              <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                {getActivityIcon(activity.type)} {activity.type}
              </Badge>
              <span className="text-gray-400 text-sm">
                {new Date(activity.createdAt).toLocaleDateString()}
              </span>
            </div>
            
            {activity.evidenceUrl && (
              <div className="mb-4">
                <img 
                  src={activity.evidenceUrl} 
                  alt="Activity evidence" 
                  className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-600"
                />
              </div>
            )}
            
            <p className="text-gray-300 text-sm mb-4">{activity.description}</p>
            
            <div className="flex items-center gap-4 pt-3 border-t border-gray-600">
              <button
                onClick={handleLike}
                disabled={likeActivity.isPending}
                className={`flex items-center gap-2 transition-colors text-sm ${
                  userLikeStatus 
                    ? 'text-military-green hover:text-military-green' 
                    : 'text-gray-400 hover:text-military-green'
                }`}
              >
                <ThumbsUp className={`h-4 w-4 ${userLikeStatus ? 'fill-current' : ''}`} />
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
                className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-sm"
              >
                <Flag className="h-4 w-4" />
                <span>Flag</span>
              </button>
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

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, MessageCircle, Flag } from "lucide-react";
import { useLocation } from "wouter";

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

  return (
    <Card className="bg-tactical-gray-light border-tactical-gray">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div 
            className="w-12 h-12 bg-military-green rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-military-green-light transition-colors"
            onClick={handleProfileClick}
          >
            <span className="text-white font-bold text-sm">
              {getInitials(activity.user.username)}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span 
                className="text-white font-bold text-sm cursor-pointer hover:text-military-green-light transition-colors"
                onClick={handleProfileClick}
              >
                {activity.user.username}
              </span>
              <Badge variant="outline" className="text-xs">
                {getActivityIcon(activity.type)} {activity.type}
              </Badge>
              <span className="text-gray-400 text-xs">
                {new Date(activity.createdAt).toLocaleDateString()}
              </span>
            </div>
            
            {activity.evidenceUrl && (
              <div className="mb-3">
                <img 
                  src={activity.evidenceUrl} 
                  alt="Activity evidence" 
                  className="w-full max-w-md h-48 object-cover rounded-lg"
                />
              </div>
            )}
            
            <p className="text-gray-300 text-sm mb-3">{activity.description}</p>
            
            <div className="flex items-center space-x-4">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onLike?.(activity.id)}
                className="text-gray-400 hover:text-white"
              >
                <ThumbsUp className="mr-1 h-4 w-4" />
                {activity.likesCount}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-400 hover:text-white"
              >
                <MessageCircle className="mr-1 h-4 w-4" />
                {activity.commentsCount}
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onFlag?.(activity.id)}
                className="text-gray-400 hover:text-red-400"
              >
                <Flag className="mr-1 h-4 w-4" />
                Flag
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

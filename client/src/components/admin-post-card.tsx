import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { 
  AlertTriangle, 
  Info, 
  Megaphone, 
  Trophy, 
  Wrench, 
  Percent,
  Clock
} from "lucide-react";

interface AdminPostCardProps {
  post: {
    id: number;
    title: string;
    content: string;
    postImageUrl?: string;
    type: string;
    priority: string;
    isActive: boolean;
    expiresAt?: string | null;
    createdAt: string;
    createdBy: number;
  };
}

export default function AdminPostCard({ post }: AdminPostCardProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="h-4 w-4" />;
      case 'announcement':
        return <Megaphone className="h-4 w-4" />;
      case 'news':
        return <Info className="h-4 w-4" />;
      case 'competition_update':
        return <Trophy className="h-4 w-4" />;
      case 'maintenance':
        return <Wrench className="h-4 w-4" />;
      case 'promotion':
        return <Percent className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'alert':
        return 'bg-red-900/20 border-red-600/30 text-red-300';
      case 'announcement':
        return 'bg-blue-900/20 border-blue-600/30 text-blue-300';
      case 'news':
        return 'bg-green-900/20 border-green-600/30 text-green-300';
      case 'competition_update':
        return 'bg-yellow-900/20 border-yellow-600/30 text-yellow-300';
      case 'maintenance':
        return 'bg-gray-900/20 border-gray-600/30 text-gray-300';
      case 'promotion':
        return 'bg-purple-900/20 border-purple-600/30 text-purple-300';
      default:
        return 'bg-blue-900/20 border-blue-600/30 text-blue-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-black';
      case 'low':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const formatType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Card className={`border-2 ${getTypeColor(post.type)} bg-opacity-10 mb-6`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getTypeColor(post.type)}`}>
              {getTypeIcon(post.type)}
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">{post.title}</h3>
              <div className="flex items-center space-x-3 mt-1">
                <Badge variant="outline" className={getPriorityColor(post.priority)}>
                  {post.priority.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-gray-300 border-gray-600">
                  {formatType(post.type)}
                </Badge>
                <span className="text-gray-400 text-sm">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
          {post.expiresAt && (
            <div className="flex items-center space-x-1 text-gray-400 text-sm">
              <Clock className="h-3 w-3" />
              <span>Expires {formatDistanceToNow(new Date(post.expiresAt), { addSuffix: true })}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-gray-300 whitespace-pre-wrap">
          {post.content}
        </div>
        {post.postImageUrl && (
          <div className="mt-4">
            <img 
              src={post.postImageUrl} 
              alt="Admin post image" 
              className="w-full max-w-md rounded-lg border border-tactical-gray"
              onError={(e) => {
                console.error("Admin post image failed to load:", post.postImageUrl);
                e.currentTarget.style.display = 'none';
              }}
              onLoad={() => {
                console.log("Admin post image loaded successfully:", post.postImageUrl);
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
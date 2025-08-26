import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import DirectMessageModal from '@/components/direct-message-modal';
import { apiRequest } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  friendId: number;
  friend: { id: number; username: string; avatar?: string | null };
  lastMessage: {
    id: number;
    content: string;
    senderId: number;
    createdAt: string;
  } | null;
  unreadCount: number;
}

interface MessageInboxProps {
  userId: number;
}

export default function MessageInbox({ userId }: MessageInboxProps) {
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [isDMModalOpen, setIsDMModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations", userId],
    queryFn: async () => {
      const response = await fetch(`/api/conversations/${userId}`);
      if (!response.ok) throw new Error("Failed to fetch conversations");
      return response.json();
    },
    enabled: !!userId,
  });

  const markAsRead = useMutation({
    mutationFn: async (friendId: number) => {
      return apiRequest("POST", `/api/conversations/${userId}/${friendId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", userId] });
    },
  });

  const handleOpenMessage = (friend: any) => {
    setSelectedFriend(friend);
    setIsDMModalOpen(true);
    // Mark conversation as read when opened
    markAsRead.mutate(friend.id);
  };

  const getInitials = (username: string) => {
    return username.split(' ').map(word => word[0]).join('').toUpperCase() || username.slice(0, 2).toUpperCase();
  };

  const formatLastMessage = (message: Conversation['lastMessage'], senderId: number) => {
    if (!message) return "No messages yet";
    
    const isOwnMessage = message.senderId === userId;
    const prefix = isOwnMessage ? "You: " : "";
    
    // Handle GIF messages
    if (message.content.startsWith('[GIF]')) {
      return `${prefix}Sent a GIF`;
    }
    
    // Truncate long messages
    const truncated = message.content.length > 50 
      ? message.content.substring(0, 50) + "..." 
      : message.content;
    
    return `${prefix}${truncated}`;
  };

  const getTotalUnreadCount = () => {
    return conversations.reduce((total, conv) => total + Number(conv.unreadCount || 0), 0);
  };

  if (isLoading) {
    return (
      <Card className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-military-green" />
              <span>Messages</span>
            </div>
            <div
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-white cursor-pointer transition-colors rounded-md hover:bg-white/10"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsExpanded(!isExpanded);
                }
              }}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardTitle>
        </CardHeader>
        {isExpanded && (
          <CardContent>
            <div className="text-gray-400 text-center py-4">Loading conversations...</div>
          </CardContent>
        )}
      </Card>
    );
  }

  if (conversations.length === 0) {
    return (
      <Card className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-military-green" />
              <span>Messages</span>
            </div>
            <div
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-white cursor-pointer transition-colors rounded-md hover:bg-white/10"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsExpanded(!isExpanded);
                }
              }}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardTitle>
        </CardHeader>
        {isExpanded && (
          <CardContent>
            <div className="text-gray-400 text-center py-4">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-sm">Start chatting with your buddies!</p>
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <>
      <Card className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-military-green" />
              <span>Messages</span>
              {getTotalUnreadCount() > 0 && (
                <Badge variant="destructive" className="bg-combat-orange">
                  {getTotalUnreadCount()}
                </Badge>
              )}
            </div>
            <div
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-white cursor-pointer transition-colors rounded-md hover:bg-white/10"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsExpanded(!isExpanded);
                }
              }}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardTitle>
        </CardHeader>
        {isExpanded && (
          <CardContent className="space-y-3">
          {conversations.slice(0, 5).map((conversation) => (
            <div
              key={conversation.friendId}
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                Number(conversation.unreadCount || 0) > 0
                  ? 'bg-military-green/10 border-military-green/30 hover:bg-military-green/20'
                  : 'backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10'
              }`}
              onClick={() => handleOpenMessage(conversation.friend)}
            >
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-military-green text-white text-sm">
                    {getInitials(conversation.friend.username)}
                  </AvatarFallback>
                </Avatar>
                {Number(conversation.unreadCount || 0) > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-combat-orange text-white text-xs"
                  >
                    {Number(conversation.unreadCount || 0)}
                  </Badge>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`font-medium truncate ${
                    Number(conversation.unreadCount || 0) > 0 ? 'text-white' : 'text-gray-300'
                  }`}>
                    {conversation.friend.username}
                  </h4>
                  {conversation.lastMessage && (
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(new Date(conversation.lastMessage.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                </div>
                <p className={`text-sm truncate ${
                  Number(conversation.unreadCount || 0) > 0 ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  {formatLastMessage(conversation.lastMessage, conversation.friendId)}
                </p>
              </div>
              
              <Send className={`h-4 w-4 ${
                Number(conversation.unreadCount || 0) > 0 ? 'text-military-green' : 'text-gray-500'
              }`} />
            </div>
          ))}
          
          {conversations.length > 5 && (
            <Button
              variant="ghost"
              className="w-full text-military-green hover:bg-military-green/10"
              onClick={() => {
                // Could expand to show all conversations or navigate to a full messages page
              }}
            >
              View All Messages ({conversations.length})
            </Button>
          )}
          </CardContent>
        )}
      </Card>

      {selectedFriend && (
        <DirectMessageModal
          isOpen={isDMModalOpen}
          onClose={() => {
            setIsDMModalOpen(false);
            setSelectedFriend(null);
            // Refresh conversations to update unread counts
            queryClient.invalidateQueries({ queryKey: ["/api/conversations", userId] });
          }}
          friend={selectedFriend}
        />
      )}
    </>
  );
}
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Send, ImageIcon, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DirectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend: {
    id: number;
    username: string;
    avatar?: string;
  };
}

export default function DirectMessageModal({ isOpen, onClose, friend }: DirectMessageModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifs, setGifs] = useState<any[]>([]);
  const [isSearchingGifs, setIsSearchingGifs] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: messages = [], refetch } = useQuery({
    queryKey: ["/api/chat", { userId1: user?.id, userId2: friend.id }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("userId1", user?.id?.toString() || "");
      params.append("userId2", friend.id.toString());
      
      const response = await fetch(`/api/chat?${params}`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: isOpen && !!user,
  });

  // Mark conversation as read when modal opens
  useEffect(() => {
    if (isOpen && user?.id && friend.id) {
      markAsRead.mutate();
    }
  }, [isOpen, user?.id, friend.id]);

  const markAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.id || !friend.id) return;
      return apiRequest("POST", `/api/conversations/${user.id}/${friend.id}/read`);
    },
    onSuccess: () => {
      // Invalidate conversations query to update unread counts
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", "/api/chat", {
        senderId: user?.id,
        receiverId: friend.id,
        content,
        type: "direct",
      });
    },
    onSuccess: () => {
      setMessage("");
      refetch();
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && user) {
      sendMessage.mutate(message.trim());
    }
  };


  // Search GIFs using Giphy API
  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      setGifs([]);
      return;
    }
    
    setIsSearchingGifs(true);
    try {
      const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=GlVGYHkr3WSBnllca54iNt0yFbjz7L65&q=${encodeURIComponent(query)}&limit=20&rating=pg-13`);
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('Failed to search GIFs:', error);
      setGifs([]);
    } finally {
      setIsSearchingGifs(false);
    }
  };

  // Handle GIF selection
  const handleGifSelect = (gifUrl: string) => {
    sendMessage.mutate(`[GIF] ${gifUrl}`);
    setShowGifPicker(false);
    setGifSearch("");
    setGifs([]);
  };

  // Render message content (handle GIFs and regular text)
  const renderMessageContent = (content: string) => {
    if (content.startsWith('[GIF] ')) {
      const gifUrl = content.substring(6);
      return (
        <img 
          src={gifUrl} 
          alt="GIF" 
          className="max-w-48 max-h-48 rounded-lg object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    return content;
  };

  // Handle GIF search input
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (gifSearch) {
        searchGifs(gifSearch);
      }
    }, 500);
    
    return () => clearTimeout(delayedSearch);
  }, [gifSearch]);

  // Auto-refresh messages
  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        refetch();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, refetch]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-tactical-gray-light border-tactical-gray text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-military-green text-white text-sm">
                {friend.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {friend.username}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-96">
          <ScrollArea className="flex-1 p-4 border border-tactical-gray rounded-lg bg-tactical-gray-lighter">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                        msg.senderId === user?.id
                          ? "bg-military-green text-white"
                          : "bg-tactical-gray text-gray-200"
                      }`}
                    >
                      <div className="break-words">
                        {renderMessageContent(msg.content)}
                      </div>
                      <p className="text-xs opacity-60 mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <form onSubmit={handleSendMessage} className="flex gap-2 mt-4">
            <div className="flex gap-2">
              {/* GIF Picker */}
              <Popover open={showGifPicker} onOpenChange={setShowGifPicker}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-tactical-gray-lighter border-tactical-gray text-white hover:bg-tactical-gray"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-4 bg-tactical-gray-light border-tactical-gray">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Search className="h-4 w-4 text-gray-400" />
                      <Input
                        value={gifSearch}
                        onChange={(e) => setGifSearch(e.target.value)}
                        placeholder="Search GIFs..."
                        className="flex-1 bg-tactical-gray-lighter border-tactical-gray text-white"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {isSearchingGifs ? (
                        <div className="text-center text-gray-400 py-4">
                          Searching...
                        </div>
                      ) : gifs.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {gifs.map((gif: any) => (
                            <button
                              key={gif.id}
                              onClick={() => handleGifSelect(gif.images.fixed_height.url)}
                              className="relative aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                            >
                              <img
                                src={gif.images.fixed_height_small.url}
                                alt={gif.title}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      ) : gifSearch ? (
                        <div className="text-center text-gray-400 py-4">
                          No GIFs found
                        </div>
                      ) : (
                        <div className="text-center text-gray-400 py-4">
                          Search for GIFs to send
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-tactical-gray-lighter border-tactical-gray text-white"
              disabled={sendMessage.isPending}
            />
            <Button
              type="submit"
              size="icon"
              className="bg-military-green hover:bg-military-green-light"
              disabled={sendMessage.isPending || !message.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
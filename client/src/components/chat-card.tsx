import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Send, Smile, ImageIcon, Search, ChevronDown, ChevronUp, Radio } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EmojiPicker from 'emoji-picker-react';
// @ts-ignore
import GiphyApi from 'giphy-api';

interface ChatCardProps {
  teamId?: number;
  competitionId?: number;
  title?: string;
}

export default function ChatCard({ teamId, competitionId, title }: ChatCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifs, setGifs] = useState<any[]>([]);
  const [isSearchingGifs, setIsSearchingGifs] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [lastViewedCount, setLastViewedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: messages = [], refetch } = useQuery({
    queryKey: ["/api/chat", { teamId, competitionId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (teamId) params.append("teamId", teamId.toString());
      if (competitionId) params.append("competitionId", competitionId.toString());
      
      const response = await fetch(`/api/chat?${params}`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: !!user,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user?.id,
          content,
          teamId,
          competitionId,
          type: teamId ? "team" : "competition",
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      refetch();
    },
    onError: () => {
      toast({
        title: "Failed to send message",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessage.mutate(message.trim());
    }
  };

  const handleEmojiClick = (emojiObject: any) => {
    setMessage(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleGifClick = (gifUrl: string) => {
    sendMessage.mutate(`[GIF] ${gifUrl}`);
    setShowGifPicker(false);
    setGifSearch("");
    setGifs([]);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Initialize Giphy API
  const giphy = new GiphyApi('sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh');

  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      setGifs([]);
      return;
    }
    
    setIsSearchingGifs(true);
    try {
      // Use fetch instead of giphy-api library to avoid callback issues
      const response = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh&q=${encodeURIComponent(query)}&limit=12&rating=pg`);
      const data = await response.json();
      setGifs(data.data || []);
    } catch (error) {
      console.error('Error searching GIFs:', error);
      setGifs([]);
    } finally {
      setIsSearchingGifs(false);
    }
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
    return <p className="text-white text-sm">{content}</p>;
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

  // Auto-refetch messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [refetch]);

  // Update last viewed count when chat is opened
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      setLastViewedCount(messages.length);
    }
  }, [isOpen, messages.length]);

  // Initialize last viewed count on first load
  useEffect(() => {
    if (messages.length > 0 && lastViewedCount === 0) {
      setLastViewedCount(messages.length);
    }
  }, [messages.length, lastViewedCount]);

  // Calculate unread messages
  const unreadCount = Math.max(0, messages.length - lastViewedCount);

  return (
    <Card className="bg-tactical-gray-light border-tactical-gray text-white">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-tactical-gray-lighter transition-colors">
            <CardTitle className="flex items-center justify-between text-lg text-white">
              <div className="flex items-center space-x-2">
                <Radio className="w-5 h-5" />
                <span>{title || (teamId ? "Team Comms" : "Competition Chat")}</span>
                {unreadCount > 0 && (
                  <span className="bg-military-green text-white text-xs px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-col h-80">
              <ScrollArea className="flex-1 bg-tactical-gray-lighter rounded-lg p-4 mb-4">
                <div className="space-y-3">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      <p>No messages yet</p>
                      <p className="text-sm">Start the conversation!</p>
                    </div>
                  ) : (
                    [...messages].reverse().map((msg: any) => {
                      const avatarUrl = msg.user?.avatar ? `/uploads/${msg.user.avatar}` : undefined;
                      
                      return (
                        <div key={msg.id} className="flex items-start space-x-3">
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarImage 
                              src={avatarUrl}
                              alt={msg.user?.username || "User"}
                            />
                            <AvatarFallback className="bg-military-green text-white text-xs">
                              {getInitials(msg.user?.username || "U")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="bg-tactical-gray-light rounded-lg p-2">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-white font-bold text-sm">{msg.user?.username || "Unknown"}</span>
                                <span className="text-gray-400 text-xs">
                                  {new Date(msg.createdAt).toLocaleTimeString()}
                                </span>
                              </div>
                              {renderMessageContent(msg.content)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
              
              <form onSubmit={handleSubmit} className="flex space-x-2">
                <div className="flex space-x-2">
                  {/* Emoji Picker */}
                  <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="bg-tactical-gray-lighter border-tactical-gray text-white hover:bg-tactical-gray"
                      >
                        <Smile className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0 bg-tactical-gray-light border-tactical-gray">
                      <EmojiPicker
                        onEmojiClick={handleEmojiClick}
                        theme={"dark" as any}
                        skinTonePickerLocation={"PREVIEW" as any}
                      />
                    </PopoverContent>
                  </Popover>

                  {/* GIF Picker */}
                  <Popover open={showGifPicker} onOpenChange={setShowGifPicker}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="bg-tactical-gray-lighter border-tactical-gray text-white hover:bg-tactical-gray"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 bg-tactical-gray-light border-tactical-gray">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Search className="w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="Search GIFs..."
                            value={gifSearch}
                            onChange={(e) => setGifSearch(e.target.value)}
                            className="bg-tactical-gray-lighter border-tactical-gray text-white placeholder-gray-400"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                          {isSearchingGifs ? (
                            <div className="col-span-3 text-center text-gray-400 py-4">
                              Searching...
                            </div>
                          ) : (
                            gifs.map((gif) => (
                              <button
                                key={gif.id}
                                onClick={() => handleGifClick(gif.images.fixed_height.url)}
                                className="relative group hover:opacity-80 transition-opacity"
                              >
                                <img
                                  src={gif.images.fixed_height_small.url}
                                  alt={gif.title}
                                  className="w-full h-20 object-cover rounded"
                                />
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                
                <Input
                  ref={inputRef}
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1 bg-tactical-gray-lighter border-tactical-gray text-white placeholder-gray-400"
                />
                <Button 
                  type="submit" 
                  disabled={!message.trim() || sendMessage.isPending}
                  className="bg-military-green hover:bg-military-green-dark text-white"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
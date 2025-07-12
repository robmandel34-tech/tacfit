import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Send, Smile, ImageIcon, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import EmojiPicker from 'emoji-picker-react';
import { GiphyApi } from 'giphy-api';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId?: number;
  competitionId?: number;
}

export default function ChatModal({ isOpen, onClose, teamId, competitionId }: ChatModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifs, setGifs] = useState<any[]>([]);
  const [isSearchingGifs, setIsSearchingGifs] = useState(false);
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
    enabled: isOpen && !!user,
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
    if (!message.trim()) return;
    sendMessage.mutate(message);
  };

  // Auto-refresh messages
  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        refetch();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, refetch]);

  const getInitials = (username: string) => {
    return username.split(' ').map(word => word[0]).join('').toUpperCase() || username.slice(0, 2).toUpperCase();
  };

  // Handle emoji selection
  const handleEmojiClick = (emojiData: any) => {
    const emoji = emojiData.emoji;
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Search GIFs using Giphy API
  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      setGifs([]);
      return;
    }
    
    setIsSearchingGifs(true);
    try {
      // Using a public Giphy API key - for production, this should be in environment variables
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-tactical-gray-light border-tactical-gray text-white max-w-2xl h-96">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {teamId ? "Team Communications" : "Competition Chat"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-full">
          <ScrollArea className="flex-1 bg-tactical-gray-lighter rounded-lg p-4 mb-4">
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <p>No messages yet</p>
                  <p className="text-sm">Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg: any) => (
                  <div key={msg.id} className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                      {msg.user?.avatar ? (
                        <img
                          src={`/uploads/${msg.user.avatar}`}
                          alt="Profile picture"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-military-green rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-xs">
                            {getInitials(msg.user?.username || "U")}
                          </span>
                        </div>
                      )}
                    </div>
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
                ))
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
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white border-tactical-gray">
                  <EmojiPicker onEmojiClick={handleEmojiClick} />
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
            />
            <Button
              type="submit"
              disabled={sendMessage.isPending || !message.trim()}
              className="bg-military-green hover:bg-military-green-light text-white"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

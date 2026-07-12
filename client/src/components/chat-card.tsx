import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Send, ImageIcon, Search, ChevronDown, ChevronUp, Radio, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = (import.meta.env.VITE_API_URL as string) ?? "";

interface ChatCardProps {
  teamId?: number;
  competitionId?: number;
  title?: string;
}

export default function ChatCard({ teamId, competitionId, title }: ChatCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifs, setGifs] = useState<any[]>([]);
  const [isSearchingGifs, setIsSearchingGifs] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [lastViewedCount, setLastViewedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRootRef = useRef<HTMLDivElement>(null);

  // Scroll only the chat box's own viewport — never the page.
  const scrollToBottom = () => {
    const viewport = scrollRootRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLDivElement | null;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  };

  const { data: messages = [], refetch } = useQuery({
    queryKey: ["/api/chat", { teamId, competitionId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (teamId) params.append("teamId", teamId.toString());
      if (competitionId) params.append("competitionId", competitionId.toString());

      const response = await fetch(`${API_BASE}/api/chat?${params}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: !!user,
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`${API_BASE}/api/chat`, {
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
      inputRef.current?.focus();
      requestAnimationFrame(scrollToBottom);
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

  const handleGifClick = (gifUrl: string) => {
    sendMessage.mutate(`[GIF] ${gifUrl}`);
    setShowGifPicker(false);
    setGifSearch("");
    setGifs([]);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      setGifs([]);
      return;
    }

    setIsSearchingGifs(true);
    try {
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
  const renderMessageContent = (content: string, isOwn: boolean) => {
    if (content.startsWith('[GIF] ')) {
      const gifUrl = content.substring(6);
      return (
        <img
          src={gifUrl}
          alt="GIF"
          className="max-w-48 max-h-48 rounded-xl object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    return (
      <p className={`text-sm leading-relaxed break-words ${isOwn ? "text-white" : "text-gray-100"}`}>
        {content}
      </p>
    );
  };

  const dayLabel = (date: Date) => {
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEE, MMM d");
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

  // Keep the view pinned to the newest message when opening or receiving.
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(scrollToBottom);
    }
  }, [isOpen, messages.length]);

  // Calculate unread messages
  const unreadCount = Math.max(0, messages.length - lastViewedCount);

  // Oldest first for display (sort defensively — the API returns them oldest-first)
  const ordered = [...messages].sort(
    (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <Card className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl shadow-xl text-white overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-white/10 transition-colors py-4">
            <CardTitle className="flex items-center justify-between text-lg text-white">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-green-700 to-green-900 ring-1 ring-green-500/40">
                  <Radio className="w-5 h-5 text-green-300" />
                </span>
                <span className="font-semibold tracking-wide">
                  {title || (teamId ? "Team Comms" : "Competition Chat")}
                </span>
                {unreadCount > 0 && (
                  <span
                    className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-500 px-1.5 text-[11px] font-bold text-black"
                    data-testid="badge-unread-count"
                  >
                    {unreadCount}
                  </span>
                )}
              </div>
              {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="p-0">
            <div className="flex flex-col h-96 border-t border-white/10">
              <ScrollArea ref={scrollRootRef} className="flex-1 bg-black/30 px-3 py-4">
                <div className="space-y-1">
                  {ordered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
                        <MessageSquare className="h-6 w-6 text-green-400" />
                      </span>
                      <p className="text-gray-300 font-medium">Radio silence</p>
                      <p className="text-sm text-gray-500">Be the first to check in with your squad.</p>
                    </div>
                  ) : (
                    ordered.map((msg: any, i: number) => {
                      const prev = ordered[i - 1];
                      const created = new Date(msg.createdAt);
                      const isOwn = msg.senderId === user?.id || msg.user?.id === user?.id;
                      const newDay = !prev || !isSameDay(new Date(prev.createdAt), created);
                      // Group consecutive messages from the same sender within the same day
                      const grouped =
                        !newDay &&
                        prev &&
                        (prev.senderId ?? prev.user?.id) === (msg.senderId ?? msg.user?.id);
                      const avatarUrl = msg.user?.avatar ? `${API_BASE}/uploads/${msg.user.avatar}` : undefined;
                      const isGif = typeof msg.content === "string" && msg.content.startsWith("[GIF] ");

                      return (
                        <div key={msg.id}>
                          {newDay && (
                            <div className="flex items-center gap-3 py-3">
                              <div className="h-px flex-1 bg-white/10" />
                              <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500">
                                {dayLabel(created)}
                              </span>
                              <div className="h-px flex-1 bg-white/10" />
                            </div>
                          )}
                          <div
                            className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"} ${grouped ? "mt-0.5" : "mt-3"}`}
                            data-testid={`chat-message-${msg.id}`}
                          >
                            {!isOwn && (
                              <div className="w-7 shrink-0">
                                {!grouped && (
                                  <Avatar className="h-7 w-7">
                                    <AvatarImage src={avatarUrl} alt={msg.user?.username || "User"} />
                                    <AvatarFallback className="bg-green-900 text-green-300 text-[10px] font-bold">
                                      {getInitials(msg.user?.username || "U")}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                            )}
                            <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                              {!isOwn && !grouped && (
                                <span className="mb-0.5 ml-1 text-xs font-semibold text-green-400">
                                  {msg.user?.username || "Unknown"}
                                </span>
                              )}
                              <div
                                className={
                                  isGif
                                    ? "overflow-hidden rounded-2xl"
                                    : isOwn
                                      ? "rounded-2xl rounded-br-sm bg-gradient-to-br from-green-700 to-green-800 px-3 py-2 shadow-md"
                                      : "rounded-2xl rounded-bl-sm bg-white/10 px-3 py-2 shadow-md ring-1 ring-white/5"
                                }
                              >
                                {renderMessageContent(msg.content, isOwn)}
                              </div>
                              <span className={`mt-0.5 text-[10px] text-gray-500 ${isOwn ? "mr-1" : "ml-1"}`}>
                                {format(created, "h:mm a")}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 border-t border-white/10 bg-white/5 px-3 py-3"
              >
                {/* GIF Picker */}
                <Popover open={showGifPicker} onOpenChange={setShowGifPicker}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full text-gray-400 hover:bg-white/10 hover:text-green-400"
                      aria-label="Send a GIF"
                      data-testid="button-gif-picker"
                    >
                      <ImageIcon className="w-5 h-5" />
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

                <Input
                  ref={inputRef}
                  placeholder="Message your squad..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="h-10 flex-1 rounded-full border-white/10 bg-black/30 px-4 text-white placeholder-gray-500 focus-visible:ring-green-600"
                  data-testid="input-chat-message"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!message.trim() || sendMessage.isPending}
                  className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-green-600 to-green-800 text-white shadow-md hover:from-green-500 hover:to-green-700 disabled:opacity-40"
                  aria-label="Send message"
                  data-testid="button-send-message"
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

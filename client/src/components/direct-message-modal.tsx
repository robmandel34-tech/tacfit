import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send } from "lucide-react";
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
                      <p>{msg.content}</p>
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
            <Input
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
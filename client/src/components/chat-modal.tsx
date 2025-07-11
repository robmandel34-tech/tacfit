import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
                    <div className="w-8 h-8 bg-military-green rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-xs">
                        {getInitials(msg.user?.username || "U")}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="bg-tactical-gray-light rounded-lg p-2">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-white font-bold text-sm">{msg.user?.username || "Unknown"}</span>
                          <span className="text-gray-400 text-xs">
                            {new Date(msg.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-white text-sm">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
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

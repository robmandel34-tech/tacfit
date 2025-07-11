import { useAuthRequired } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import Navigation from "@/components/navigation";
import ActivityCard from "@/components/activity-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Crown, Target, Camera, Send, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Team() {
  const { user, isLoading } = useAuthRequired();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");

  // Get user's current team membership
  const { data: userTeamMember } = useQuery({
    queryKey: [`/api/team-members/${user?.id}`],
    enabled: !!user,
  });

  // Get team details
  const { data: team } = useQuery({
    queryKey: [`/api/teams/${userTeamMember?.[0]?.teamId}`],
    enabled: !!userTeamMember?.[0]?.teamId,
  });

  // Get all team members
  const { data: teamMembers = [] } = useQuery({
    queryKey: [`/api/team-members/team/${userTeamMember?.[0]?.teamId}`],
    enabled: !!userTeamMember?.[0]?.teamId,
  });

  // Get team activities
  const { data: teamActivities = [] } = useQuery({
    queryKey: [`/api/activities/team/${userTeamMember?.[0]?.teamId}`],
    enabled: !!userTeamMember?.[0]?.teamId,
  });

  // Get team chat messages
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ["/api/chat", { teamId: userTeamMember?.[0]?.teamId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userTeamMember?.[0]?.teamId) params.append("teamId", userTeamMember[0].teamId.toString());
      
      const response = await fetch(`/api/chat?${params}`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      return response.json();
    },
    enabled: !!userTeamMember?.[0]?.teamId,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: user?.id,
          content,
          teamId: userTeamMember?.[0]?.teamId,
          type: "team",
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      refetchMessages();
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
    if (userTeamMember?.[0]?.teamId) {
      const interval = setInterval(() => {
        refetchMessages();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [userTeamMember?.[0]?.teamId, refetchMessages]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user || !userTeamMember || userTeamMember.length === 0) {
    return (
      <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
        <div className="text-center">
          <Users className="mx-auto h-16 w-16 text-gray-500 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Team</h2>
          <p className="text-gray-400">Join a competition to be assigned to a team</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tactical-gray pb-20">
      <Navigation />
      
      <main className="container mx-auto px-4 py-6">
        {/* Team Header */}
        {team && (
          <Card className="mb-6 sharp-card bg-tactical-gray-light border-tactical-gray">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  {team.name}
                </CardTitle>
                <div className="flex items-center">
                  <Target className="mr-1 h-4 w-4 text-military-green" />
                  <span className="text-military-green font-bold">{team.points} points</span>
                </div>
              </div>
              {team.motto && (
                <p className="text-gray-300 italic mt-2">"{team.motto}"</p>
              )}
            </CardHeader>
            <CardContent>
              {/* Team Picture */}
              {team.pictureUrl ? (
                <div className="mb-4">
                  <img 
                    src={team.pictureUrl} 
                    alt={`${team.name} team photo`}
                    className="w-full h-48 object-cover rounded-sm"
                  />
                </div>
              ) : (
                <div className="mb-4 w-full h-48 bg-tactical-gray rounded-sm flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="mx-auto h-12 w-12 text-gray-500 mb-2" />
                    <p className="text-gray-400">No team photo uploaded</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Team Members */}
        <Card className="mb-6 sharp-card bg-tactical-gray-light border-tactical-gray">
          <CardHeader>
            <CardTitle className="text-white">Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamMembers.map((member: any) => (
                <div key={member.id} className="bg-tactical-gray p-4 rounded-sm">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.user?.avatar} />
                      <AvatarFallback className="bg-military-green text-white">
                        {member.user?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="font-medium text-white">{member.user?.username}</h3>
                        {member.role === 'captain' && (
                          <Crown className="ml-2 h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-400 capitalize">{member.role}</p>
                      <p className="text-sm text-military-green">{member.user?.points || 0} points</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Team Chat */}
        <Card className="mb-6 sharp-card bg-tactical-gray-light border-tactical-gray">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <MessageCircle className="mr-2 h-5 w-5" />
              Team Chat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Messages */}
              <ScrollArea className="h-80 w-full rounded-sm border border-tactical-gray bg-tactical-gray p-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                      <p className="text-gray-400">No messages yet</p>
                      <p className="text-sm text-gray-500">Start a conversation with your team!</p>
                    </div>
                  ) : (
                    messages.map((msg: any) => (
                      <div key={msg.id} className="flex items-start space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-military-green text-white text-xs">
                            {msg.sender?.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-white">{msg.sender?.username}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(msg.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                          <p className="text-sm text-gray-300 mt-1">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <form onSubmit={handleSubmit} className="flex space-x-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-tactical-gray border-tactical-gray text-white placeholder-gray-400"
                />
                <Button 
                  type="submit" 
                  disabled={!message.trim() || sendMessage.isPending}
                  className="bg-military-green hover:bg-military-green-light"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* Team Activities */}
        <Card className="sharp-card bg-tactical-gray-light border-tactical-gray">
          <CardHeader>
            <CardTitle className="text-white">Team Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamActivities.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                  <p className="text-gray-400">No team activities yet</p>
                  <p className="text-sm text-gray-500">Submit your first activity to get started!</p>
                </div>
              ) : (
                teamActivities.map((activity: any) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
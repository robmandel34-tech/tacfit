import { useAuthRequired } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Navigation from "@/components/navigation";
import ActivityCard from "@/components/activity-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Crown, Target, Camera, Send, MessageCircle, Edit2, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Team() {
  const { user, isLoading } = useAuthRequired();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [message, setMessage] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isEditingMotto, setIsEditingMotto] = useState(false);
  const [mottoText, setMottoText] = useState("");

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

  // Upload team photo mutation
  const uploadTeamPhoto = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("photo", file);
      
      const response = await fetch(`/api/teams/${team?.id}/photo`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload photo");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Photo updated!",
        description: "Your team photo has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${team?.id}`] });
      setIsUploadingPhoto(false);
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to update team photo. Please try again.",
        variant: "destructive",
      });
      setIsUploadingPhoto(false);
    },
  });

  // Update team motto mutation
  const updateTeamMotto = useMutation({
    mutationFn: async (motto: string) => {
      const response = await fetch(`/api/teams/${team?.id}/motto`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motto }),
      });

      if (!response.ok) throw new Error("Failed to update motto");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Motto updated!",
        description: "Your team motto has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${team?.id}`] });
      setIsEditingMotto(false);
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update team motto. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessage.mutate(message);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploadingPhoto(true);
      uploadTeamPhoto.mutate(file);
    }
  };

  const triggerPhotoUpload = () => {
    const fileInput = document.getElementById('team-photo-input') as HTMLInputElement;
    fileInput?.click();
  };

  const handleMottoEdit = () => {
    setMottoText(team?.motto || "");
    setIsEditingMotto(true);
  };

  const handleMottoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mottoText.trim()) {
      updateTeamMotto.mutate(mottoText.trim());
    }
  };

  const handleMottoCancel = () => {
    setIsEditingMotto(false);
    setMottoText("");
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
              
              {/* Team Motto Section */}
              <div className="mt-4">
                {isEditingMotto ? (
                  <form onSubmit={handleMottoSubmit} className="flex items-center space-x-2">
                    <Input
                      value={mottoText}
                      onChange={(e) => setMottoText(e.target.value)}
                      placeholder="Enter team motto..."
                      className="flex-1 bg-tactical-gray text-white placeholder-gray-400 border-tactical-gray"
                      maxLength={100}
                      autoFocus
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="bg-military-green hover:bg-military-green-light text-white"
                      disabled={updateTeamMotto.isPending || !mottoText.trim()}
                    >
                      {updateTeamMotto.isPending ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleMottoCancel}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-gray-300 italic">
                      {team.motto ? `"${team.motto}"` : "No motto set"}
                    </p>
                    {(userTeamMember?.[0]?.role === 'captain' || team.captainId === user?.id) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMottoEdit}
                        className="text-gray-400 hover:text-white ml-2"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Team Picture */}
              <div className="mb-4 relative">
                {team.pictureUrl ? (
                  <div 
                    className="relative cursor-pointer group"
                    onClick={triggerPhotoUpload}
                  >
                    <img 
                      src={team.pictureUrl} 
                      alt={`${team.name} team photo`}
                      className="w-full h-48 object-cover rounded-sm"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="text-center">
                        <Camera className="mx-auto h-8 w-8 text-white mb-2" />
                        <p className="text-white text-sm">Click to update photo</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="w-full h-48 bg-tactical-gray rounded-sm flex items-center justify-center cursor-pointer hover:bg-tactical-gray-lighter transition-colors"
                    onClick={triggerPhotoUpload}
                  >
                    <div className="text-center">
                      <Camera className="mx-auto h-12 w-12 text-gray-500 mb-2" />
                      <p className="text-gray-400">Click to upload team photo</p>
                    </div>
                  </div>
                )}
                
                {isUploadingPhoto && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-white">Uploading...</div>
                  </div>
                )}
              </div>
              
              {/* Hidden file input */}
              <input
                id="team-photo-input"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
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
                    <Avatar 
                      className="h-12 w-12 cursor-pointer hover:ring-2 hover:ring-military-green transition-all"
                      onClick={() => navigate(`/profile/${member.user?.id}`)}
                    >
                      <AvatarImage src={member.user?.avatar ? `/uploads/${member.user.avatar}` : undefined} />
                      <AvatarFallback className="bg-military-green text-white">
                        {member.user?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 
                          className="font-medium text-white cursor-pointer hover:text-military-green transition-colors"
                          onClick={() => navigate(`/profile/${member.user?.id}`)}
                        >
                          {member.user?.username}
                        </h3>
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
                        <Avatar 
                          className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-military-green transition-all"
                          onClick={() => navigate(`/profile/${msg.sender?.id}`)}
                        >
                          <AvatarImage src={msg.sender?.avatar ? `/uploads/${msg.sender.avatar}` : undefined} />
                          <AvatarFallback className="bg-military-green text-white text-xs">
                            {msg.sender?.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p 
                              className="text-sm font-medium text-white cursor-pointer hover:text-military-green transition-colors"
                              onClick={() => navigate(`/profile/${msg.sender?.id}`)}
                            >
                              {msg.sender?.username}
                            </p>
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
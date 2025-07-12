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
import ChatCard from "@/components/chat-card";
import MissionWhiteboard from "@/components/mission-whiteboard";
import { useToast } from "@/hooks/use-toast";

export default function Team() {
  const { user, isLoading } = useAuthRequired();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isEditingMotto, setIsEditingMotto] = useState(false);
  const [mottoText, setMottoText] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameText, setNameText] = useState("");

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

  // Get competition details
  const { data: competition } = useQuery({
    queryKey: [`/api/competitions/${team?.competitionId}`],
    enabled: !!team?.competitionId,
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
      // Invalidate all team-related queries to update team photo everywhere
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${team?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString().includes("/api/teams") 
      });
      // Invalidate competition queries that include team data
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString().includes("/api/competitions") 
      });
      // Invalidate team member queries
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString().includes("/api/team-members") 
      });
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
      // Invalidate all team-related queries to update team motto everywhere
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${team?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString().includes("/api/teams") 
      });
      // Invalidate competition queries that include team data
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString().includes("/api/competitions") 
      });
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

  // Update team name mutation
  const updateTeamName = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(`/api/teams/${team?.id}/name`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update name");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Team name updated!",
        description: "Your team name has been updated successfully.",
      });
      // Invalidate all team-related queries to update team name everywhere
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${team?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString().includes("/api/teams") 
      });
      // Invalidate competition queries that include team data
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString().includes("/api/competitions") 
      });
      // Invalidate team member queries
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString().includes("/api/team-members") 
      });
      setIsEditingName(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
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

  const handleNameEdit = () => {
    setNameText(team?.name || "");
    setIsEditingName(true);
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameText.trim()) {
      updateTeamName.mutate(nameText.trim());
    }
  };

  const handleNameCancel = () => {
    setIsEditingName(false);
    setNameText("");
  };



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
          <Card className="mb-6 tile-card-elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1">
                  <Users className="mr-2 h-5 w-5 text-white" />
                  {isEditingName ? (
                    <form onSubmit={handleNameSubmit} className="flex items-center space-x-2 flex-1">
                      <Input
                        value={nameText}
                        onChange={(e) => setNameText(e.target.value)}
                        placeholder="Enter team name..."
                        className="flex-1 bg-tactical-gray text-white placeholder-gray-400 border-tactical-gray"
                        maxLength={50}
                        autoFocus
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="bg-military-green hover:bg-military-green-light text-white"
                        disabled={updateTeamName.isPending || !nameText.trim()}
                      >
                        {updateTeamName.isPending ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleNameCancel}
                        className="text-gray-400 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </form>
                  ) : (
                    <div className="flex items-center">
                      <CardTitle className="text-white">{team.name}</CardTitle>
                      {(userTeamMember?.[0]?.role === 'captain' || team.captainId === user?.id) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleNameEdit}
                          className="text-gray-400 hover:text-white ml-2"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
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
              
              {/* Activity Progress Section */}
              {competition && competition.requiredActivities && competition.requiredActivities.length > 0 && (
                <div className="mt-4 p-4 bg-tactical-gray rounded-lg border border-tactical-gray">
                  <h3 className="text-white font-semibold mb-3 flex items-center">
                    <Target className="mr-2 h-4 w-4 text-military-green" />
                    Activity Progress
                  </h3>
                  <div className="space-y-3">
                    {competition.requiredActivities.map((activityType: string, index: number) => {
                      // Calculate progress for this activity type
                      const activitiesOfType = teamActivities.filter((activity: any) => activity.type === activityType);
                      const totalQuantity = activitiesOfType.reduce((sum: number, activity: any) => {
                        const quantity = parseInt(activity.quantity || '0');
                        return sum + quantity;
                      }, 0);
                      
                      // Get target goal for this activity type
                      const targetGoal = competition.targetGoals?.[index] || '';
                      const targetNumber = parseInt(targetGoal.replace(/[^0-9]/g, '')) || 0;
                      
                      // Get unit from target goal
                      const unit = targetGoal.includes('steps') ? 'steps' : 
                                  targetGoal.includes('minutes') ? 'minutes' : 
                                  targetGoal.includes('reps') ? 'reps' : 
                                  targetGoal.includes('miles') ? 'miles' : 'units';
                      
                      const percentage = targetNumber > 0 ? Math.min((totalQuantity / targetNumber) * 100, 100) : 0;
                      
                      return (
                        <div key={activityType} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-300 capitalize font-medium">
                              {activityType === 'cardio' ? 'Cardio Training' :
                               activityType === 'strength' ? 'Strength Operations' :
                               activityType === 'flexibility' ? 'Mobility Training' :
                               activityType === 'sports' ? 'Combat Sports' : 'Special Operations'}
                            </span>
                            <span className="text-sm text-gray-400">
                              {totalQuantity.toLocaleString()}/{targetNumber.toLocaleString()} {unit}
                            </span>
                          </div>
                          <div className="w-full bg-tactical-gray-light rounded-full h-2">
                            <div 
                              className="bg-military-green h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-400">
                            {percentage.toFixed(1)}% complete
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Mission Planning Whiteboard */}
        <div className="mb-6">
          <MissionWhiteboard 
            teamId={userTeamMember?.[0]?.teamId}
            competitionId={team?.competitionId}
          />
        </div>

        {/* Team Chat - Collapsible */}
        <div className="mb-6">
          <ChatCard 
            teamId={userTeamMember?.[0]?.teamId}
            title="Team Comms"
          />
        </div>

        {/* Team Members */}
        <Card className="mb-6 tile-card">
          <CardHeader>
            <CardTitle className="text-white">Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamMembers.map((member: any) => (
                <div key={member.id} className="content-tile p-4">
                  <div className="flex items-start space-x-3">
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
                      {member.user?.motto && (
                        <p className="text-xs text-gray-300 italic mt-1">
                          "{member.user.motto}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
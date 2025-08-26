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
import { Users, Crown, Target, Camera, Send, MessageCircle, Edit2, Check, X, ChevronDown, ChevronUp, UserPlus, Trophy } from "lucide-react";
import ChatCard from "@/components/chat-card";
import MissionPlanningBoard from "@/components/mission-planning-board";
import TeamInviteModal from "@/components/team-invite-modal";

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
  const [isProgressExpanded, setIsProgressExpanded] = useState(false);
  const [lastViewedProgress, setLastViewedProgress] = useState<Record<string, number>>({});
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

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

  // Get activity types for display names
  const { data: activityTypes } = useQuery({
    queryKey: ['/api/activity-types'],
    enabled: !!user,
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

  // Get user's competition results for team display
  const { data: userResults } = useQuery({
    queryKey: ["/api/users", user?.id, "competition-results"],
    enabled: !!user,
  });

  // Get mission tasks
  const { data: missionTasks = [] } = useQuery({
    queryKey: [`/api/mission-tasks/team/${userTeamMember?.[0]?.teamId}`],
    enabled: !!userTeamMember?.[0]?.teamId,
  });



  // Load last viewed progress from localStorage
  useEffect(() => {
    if (team?.id) {
      const stored = localStorage.getItem(`progress_viewed_${team.id}`);
      if (stored) {
        setLastViewedProgress(JSON.parse(stored));
      }
    }
  }, [team?.id]);

  // Save last viewed progress to localStorage
  const updateLastViewedProgress = (progressData: Record<string, number>) => {
    if (team?.id) {
      localStorage.setItem(`progress_viewed_${team.id}`, JSON.stringify(progressData));
      setLastViewedProgress(progressData);
    }
  };

  // Handle expanding progress card
  const handleProgressExpand = () => {
    setIsProgressExpanded(!isProgressExpanded);
    if (!isProgressExpanded && competition?.requiredActivities && teamActivities) {
      // When expanding, mark current progress as viewed (only activities after competition start)
      const currentProgress: Record<string, number> = {};
      competition.requiredActivities.forEach((activityType: string) => {
        const activitiesOfType = teamActivities.filter((activity: any) => {
          const isCorrectType = activity.type === activityType;
          const submittedAfterStart = new Date(activity.createdAt) >= new Date(competition.startDate);
          return isCorrectType && submittedAfterStart;
        });
        const totalQuantity = activitiesOfType.reduce((sum: number, activity: any) => {
          const quantity = parseInt(activity.quantity || '0');
          return sum + quantity;
        }, 0);
        currentProgress[activityType] = totalQuantity;
      });
      updateLastViewedProgress(currentProgress);
    }
  };

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

  // Function to count pending tasks for a team member
  const getPendingTasksCount = (userId: number) => {
    return missionTasks.filter((task: any) => 
      task.assignedTo === userId.toString() && 
      task.status === 'pending' && 
      !task.completed
    ).length;
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
    <div className="min-h-screen backdrop-blur-md bg-white/5 pb-20">
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
                  <span className="text-military-green font-bold">
                    {(() => {
                      if (!competition?.requiredActivities || !competition?.targetGoals) {
                        return `${team.points} pts`;
                      }
                      
                      // Check if competition has started
                      const competitionHasStarted = new Date() >= new Date(competition.startDate);
                      
                      // If competition hasn't started, show "At Base Camp"
                      if (!competitionHasStarted) {
                        return "At Base Camp";
                      }
                      
                      // Calculate overall team completion percentage
                      let totalProgress = 0;
                      let activityCount = 0;
                      
                      competition.requiredActivities.forEach((activityType: string, index: number) => {
                        // Only count activities submitted after competition start date
                        const activitiesOfType = teamActivities.filter((activity: any) => {
                          const isCorrectType = activity.type === activityType;
                          const submittedAfterStart = new Date(activity.createdAt) >= new Date(competition.startDate);
                          return isCorrectType && submittedAfterStart;
                        });
                        const totalQuantity = activitiesOfType.reduce((sum: number, activity: any) => {
                          const quantity = parseInt(activity.quantity || '0');
                          return sum + quantity;
                        }, 0);
                        
                        const targetGoal = competition.targetGoals?.[index] || '';
                        const targetNumber = parseInt(targetGoal.replace(/[^0-9]/g, '')) || 0;
                        
                        if (targetNumber > 0) {
                          const percentage = Math.min((totalQuantity / targetNumber) * 100, 100);
                          totalProgress += percentage;
                          activityCount++;
                        }
                      });
                      
                      const overallPercentage = activityCount > 0 ? Math.round(totalProgress / activityCount) : 0;
                      return `${overallPercentage}% complete`;
                    })()}
                  </span>
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
              
              {/* Activity Progress Section - Collapsible */}
              {/* Competition Results Display */}
              {(competition as any)?.isCompleted && (userResults as any)?.history?.find((h: any) => h.competitionId === (competition as any)?.id) && (
                <div className="mt-4">
                  <div className="p-4 bg-gradient-to-r from-military-green-dark to-military-green border border-military-green/30 rounded-none">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy className="h-5 w-5 text-yellow-400" />
                      <h3 className="font-semibold text-white">Competition Results</h3>
                    </div>
                    {(() => {
                      const userResult = (userResults as any)?.history?.find((h: any) => h.competitionId === (competition as any)?.id);
                      if (userResult) {
                        return (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-300">Final Ranking:</span>
                              <span className="font-bold">
                                {userResult.finalRank === 1 ? <span className="text-yellow-400">🥇 1st Place</span> : 
                                 userResult.finalRank === 2 ? <span className="text-gray-300">🥈 2nd Place</span> : 
                                 userResult.finalRank === 3 ? <span className="text-orange-400">🥉 3rd Place</span> : 
                                 <span className="text-white">{userResult.finalRank}th Place</span>}
                              </span>
                            </div>
                            {userResult.pointsEarned > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-300">Points Earned:</span>
                                <span className="text-yellow-400 font-bold">+{userResult.pointsEarned} pts</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-300">Team:</span>
                              <span className="text-white font-medium">{userResult.team?.name || (team as any)?.name}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              )}

              {(competition as any) && (competition as any).requiredActivities && (competition as any).requiredActivities.length > 0 && (
                <div className="mt-4">
                  {/* Competition Not Started Warning */}
                  {(() => {
                    const competitionHasStarted = new Date() >= new Date(competition.startDate);
                    if (!competitionHasStarted) {
                      return (
                        <div className="mb-4 bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="h-5 w-5 text-orange-500" />
                            <h3 className="font-semibold text-orange-100">Activity Progress Awaiting Start</h3>
                          </div>
                          <p className="text-sm text-orange-200">
                            Progress tracking begins when the competition starts on {new Date(competition.startDate).toLocaleDateString()}. Current activities won't count toward targets until then.
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  <div 
                    className="p-4 bg-tactical-gray rounded-lg border border-tactical-gray cursor-pointer hover:bg-tactical-gray-light transition-colors"
                    onClick={handleProgressExpand}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Target className="mr-2 h-4 w-4 text-military-green" />
                        <h3 className="text-white font-semibold">Activity Progress</h3>
                        {(() => {
                          // Check if competition has started
                          const competitionHasStarted = new Date() >= new Date(competition.startDate);
                          
                          // Calculate current progress (only activities after competition start)
                          const currentProgress: Record<string, number> = {};
                          competition.requiredActivities.forEach((activityType: string) => {
                            const activitiesOfType = teamActivities.filter((activity: any) => {
                              const isCorrectType = activity.type === activityType;
                              const submittedAfterStart = new Date(activity.createdAt) >= new Date(competition.startDate);
                              return isCorrectType && submittedAfterStart;
                            });
                            const totalQuantity = activitiesOfType.reduce((sum: number, activity: any) => {
                              const quantity = parseInt(activity.quantity || '0');
                              return sum + quantity;
                            }, 0);
                            // If competition hasn't started, progress stays at 0
                            currentProgress[activityType] = competitionHasStarted ? totalQuantity : 0;
                          });

                          // Check if there's new progress (only if competition has started)
                          const hasNewProgress = competitionHasStarted && Object.keys(currentProgress).some(activityType => {
                            const current = currentProgress[activityType] || 0;
                            const lastViewed = lastViewedProgress[activityType] || 0;
                            return current > lastViewed;
                          });

                          return hasNewProgress ? (
                            <div className="ml-2 w-2 h-2 bg-military-green rounded-full animate-pulse" />
                          ) : null;
                        })()}
                      </div>
                      {isProgressExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    
                    {isProgressExpanded && (
                      <div className="mt-4 space-y-3">
                        {competition.requiredActivities.map((activityType: string, index: number) => {
                          // Check if competition has started
                          const competitionHasStarted = new Date() >= new Date(competition.startDate);
                          
                          // Calculate progress for this activity type (only activities after competition start)
                          const activitiesOfType = teamActivities.filter((activity: any) => {
                            const isCorrectType = activity.type === activityType;
                            const submittedAfterStart = new Date(activity.createdAt) >= new Date(competition.startDate);
                            return isCorrectType && submittedAfterStart;
                          });
                          const rawTotalQuantity = activitiesOfType.reduce((sum: number, activity: any) => {
                            const quantity = parseInt(activity.quantity || '0');
                            return sum + quantity;
                          }, 0);
                          
                          // If competition hasn't started, total quantity is 0 for progress tracking
                          const totalQuantity = competitionHasStarted ? rawTotalQuantity : 0;
                          
                          // Get target goal for this activity type
                          const targetGoal = competition.targetGoals?.[index] || '';
                          const targetNumber = parseInt(targetGoal.replace(/[^0-9]/g, '')) || 0;
                          
                          // Get unit from target goal
                          const unit = targetGoal.includes('steps') ? 'steps' : 
                                      targetGoal.includes('minutes') ? 'minutes' : 
                                      targetGoal.includes('reps') ? 'reps' : 
                                      targetGoal.includes('miles') ? 'miles' : 'units';
                          
                          const percentage = targetNumber > 0 ? Math.min((totalQuantity / targetNumber) * 100, 100) : 0;
                          
                          // Check if this activity type has new progress (only if competition has started)
                          const lastViewed = lastViewedProgress[activityType] || 0;
                          const hasNewProgressForType = competitionHasStarted && totalQuantity > lastViewed;
                          
                          return (
                            <div key={activityType} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center">
                                  <span className="text-sm text-gray-300 capitalize font-medium">
                                    {(() => {
                                      if (activityTypes && Array.isArray(activityTypes)) {
                                        const activityTypeObj = activityTypes.find((at: any) => at.name === activityType);
                                        if (activityTypeObj) {
                                          return activityTypeObj.displayName;
                                        }
                                      }
                                      // Fallback for unknown types
                                      return activityType.charAt(0).toUpperCase() + activityType.slice(1);
                                    })()}
                                  </span>
                                  {hasNewProgressForType && (
                                    <div className="ml-2 w-1.5 h-1.5 bg-military-green rounded-full animate-pulse" />
                                  )}
                                </div>
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
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}



        {/* Team Chat - Collapsible */}
        <div className="mb-6">
          <ChatCard 
            teamId={userTeamMember?.[0]?.teamId}
            title="Team Comms"
          />
        </div>

        {/* Mission Planning Board */}
        {userTeamMember?.[0]?.teamId && teamMembers.length > 0 && (
          <div className="mb-6">
            <MissionPlanningBoard 
              teamId={userTeamMember[0].teamId}
              teamMembers={teamMembers}
            />
          </div>
        )}

        {/* Team Members */}
        <Card className="mb-6 tile-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Team Members</CardTitle>
              {(userTeamMember?.[0]?.role === 'captain' || team?.captainId === user?.id) && competition && (
                <Button
                  size="sm"
                  onClick={() => setIsInviteModalOpen(true)}
                  className="bg-military-green hover:bg-military-green-light text-white"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Filled Member Slots */}
              {teamMembers.map((member: any) => (
                <div key={member.id} className="content-tile p-4">
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
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-400 capitalize">{member.role}</p>
                        {getPendingTasksCount(member.user?.id) > 0 && (
                          <Badge 
                            variant="secondary" 
                            className="bg-orange-500 text-white text-xs px-1.5 py-0.5 ml-2 text-[10px] leading-tight"
                          >
                            {getPendingTasksCount(member.user?.id)} tasks
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-military-green">{member.user?.points || 0} points</p>
                    </div>
                    <div className="flex-1 flex justify-center">
                      {member.user?.motto && (
                        <p className="text-sm text-gray-300 italic">
                          "{member.user.motto}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Open Member Slots */}
              {competition && teamMembers.length < competition.maxTeamSize && 
                Array.from({ length: competition.maxTeamSize - teamMembers.length }).map((_, index) => (
                  <div key={`open-slot-${index}`} className="content-tile p-4 border-2 border-dashed border-tactical-gray-lighter">
                    <div className="flex items-center justify-center h-full min-h-[120px]">
                      <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full border-2 border-dashed border-gray-500 flex items-center justify-center">
                          <UserPlus className="h-6 w-6 text-gray-500" />
                        </div>
                        <p className="text-gray-400 text-sm font-medium mb-2">Open Slot</p>
                        {(userTeamMember?.[0]?.role === 'captain' || team?.captainId === user?.id) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsInviteModalOpen(true)}
                            className="border-military-green text-military-green hover:bg-military-green hover:text-white"
                          >
                            Invite Member
                          </Button>
                        ) : (
                          <p className="text-xs text-gray-500">Captain can invite</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              }
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
      
      {/* Team Invite Modal */}
      {team && competition && (
        <TeamInviteModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          teamId={team.id}
          teamName={team.name}
          competitionName={competition.name}
        />
      )}
    </div>
  );
}
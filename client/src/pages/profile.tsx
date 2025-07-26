import { useAuthRequired } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams, useLocation } from "wouter";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Users, Calendar, UserPlus, MessageCircle, Send, Clock, Check, X, Bell, Camera, Upload, Search, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import DirectMessageModal from "@/components/direct-message-modal";
import FindFriendsModal from "@/components/find-friends-modal";
import StravaIntegration from "@/components/strava-integration";

export default function Profile() {
  const { user, isLoading } = useAuthRequired();
  const { updateUser } = useAuth();
  const { userId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [isDMModalOpen, setIsDMModalOpen] = useState(false);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [isFindFriendsModalOpen, setIsFindFriendsModalOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isEditingMotto, setIsEditingMotto] = useState(false);
  const [mottoText, setMottoText] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameText, setNameText] = useState("");
  const [isActivitiesModalOpen, setIsActivitiesModalOpen] = useState(false);
  const [isCompetitionsModalOpen, setIsCompetitionsModalOpen] = useState(false);
  const [isWinsModalOpen, setIsWinsModalOpen] = useState(false);
  const [isConfirmRemoveOpen, setIsConfirmRemoveOpen] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState<any>(null);

  const isOwnProfile = !userId || userId === user?.id?.toString();
  const targetUserId = isOwnProfile ? user?.id : parseInt(userId!);

  // Get profile user data
  const { data: profileUser } = useQuery({
    queryKey: ["/api/users", targetUserId],
    enabled: !!targetUserId,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["/api/history", targetUserId],
    enabled: !!targetUserId,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["/api/activities", "user", targetUserId],
    queryFn: () => fetch(`/api/activities?userId=${targetUserId}`).then(res => res.json()),
    enabled: !!targetUserId,
  });

  // Get current team membership to check active competition participation
  const { data: currentTeamMembership = [] } = useQuery({
    queryKey: ["/api/team-members", targetUserId],
    enabled: !!targetUserId,
  });

  // Get current team details if user has active membership
  const { data: currentTeam } = useQuery({
    queryKey: ["/api/teams", currentTeamMembership[0]?.teamId],
    enabled: currentTeamMembership.length > 0 && !!currentTeamMembership[0]?.teamId,
  });

  // Get current competition details if user has active team
  const { data: currentCompetition } = useQuery({
    queryKey: ["/api/competitions", currentTeam?.competitionId],
    enabled: !!currentTeam?.competitionId,
  });

  // Calculate competitions count (completed + current active participation)
  const completedCompetitions = history.length;
  const activeCompetitions = currentTeamMembership.length > 0 ? 1 : 0;
  const totalCompetitions = completedCompetitions + activeCompetitions;

  // Calculate wins (1st place finishes)
  const wins = history.filter((record: any) => record.finalRank === 1).length;

  // Get friends for the current user to check relationships
  const { data: friends = [] } = useQuery({
    queryKey: ["/api/friends", user?.id],
    enabled: !!user?.id,
  });

  // Get incoming friend requests for the current user
  const { data: incomingRequests = [] } = useQuery({
    queryKey: ["/api/friends", user?.id, "requests"],
    enabled: !!user?.id && isOwnProfile,
  });

  // Get pending tasks for the current user (only on own profile)
  const { data: pendingTasks = [] } = useQuery({
    queryKey: [`/api/mission-tasks/user/${user?.id}/pending`],
    enabled: !!user?.id && isOwnProfile,
  });

  // Friend request mutation
  const sendFriendRequest = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/friends", {
        userId: user?.id,
        friendId: targetUserId,
        status: "pending"
      });
    },
    onSuccess: () => {
      toast({
        title: "Friend request sent",
        description: "Your friend request has been sent successfully.",
      });
      // Refresh the current user's friends list to update the UI
      queryClient.invalidateQueries({ queryKey: ["/api/friends", user?.id] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send friend request. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Accept/Deny friend request mutation
  const handleFriendRequest = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number; status: string }) => {
      return apiRequest("PUT", `/api/friends/${requestId}`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Friend request updated",
        description: "The friend request has been updated successfully.",
      });
      // Refresh both friends and incoming requests
      queryClient.invalidateQueries({ queryKey: ["/api/friends", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends", user?.id, "requests"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update friend request. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Profile picture upload mutation
  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      setIsUploadingAvatar(true);
      const formData = new FormData();
      formData.append("avatar", file);
      
      const response = await fetch(`/api/users/${user?.id}/avatar`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload avatar");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been updated successfully.",
      });
      // Invalidate all relevant queries to update profile pictures everywhere
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/chat"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      // Also invalidate specific activity queries that may exist
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString().includes("/api/activities") 
      });
      // Update user context with new avatar
      updateUser({ avatar: data.avatar });
      setIsUploadingAvatar(false);
    },
    onError: (error) => {
      let errorMessage = "Failed to upload profile picture. Please try again.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsUploadingAvatar(false);
    },
  });

  // Cover photo upload mutation
  const uploadCover = useMutation({
    mutationFn: async (file: File) => {
      setIsUploadingCover(true);
      const formData = new FormData();
      formData.append("coverPhoto", file);
      
      const response = await fetch(`/api/users/${user?.id}/cover`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload cover photo");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Cover photo updated",
        description: "Your cover photo has been updated successfully.",
      });
      // Invalidate user queries to update cover photos
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id] });
      // Update user context with new cover photo
      updateUser({ coverPhoto: data.coverPhoto });
      setIsUploadingCover(false);
    },
    onError: (error) => {
      let errorMessage = "Failed to upload cover photo. Please try again.";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setIsUploadingCover(false);
    },
  });

  // Update user motto mutation
  const updateUserMotto = useMutation({
    mutationFn: async (motto: string) => {
      const response = await fetch(`/api/users/${displayUser.id}/motto`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motto }),
      });

      if (!response.ok) throw new Error("Failed to update motto");
      return response.json();
    },
    onSuccess: (updatedUser) => {
      toast({
        title: "Motto updated!",
        description: "Your personal motto has been updated successfully.",
      });
      // Update the user context if it's the current user
      if (isOwnProfile && updateUser) {
        updateUser(updatedUser);
      }
      // Update the query cache directly with the new user data
      queryClient.setQueryData(["/api/users", displayUser.id], updatedUser);
      // Invalidate all user-related queries to update motto everywhere
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString().includes("/api/team-members") 
      });
      // Also invalidate the team members query for the specific team
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString().includes("/api/team-members/team/") 
      });
      setIsEditingMotto(false);
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update motto. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle file selection for avatar
  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadAvatar.mutate(file);
    }
  };

  // Handle file selection for cover photo
  const handleCoverUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadCover.mutate(file);
    }
  };

  // Handle motto editing
  const handleMottoEdit = () => {
    setMottoText(displayUser.motto || "");
    setIsEditingMotto(true);
  };

  const handleMottoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mottoText.trim()) {
      updateUserMotto.mutate(mottoText.trim());
    }
  };

  const handleMottoCancel = () => {
    setIsEditingMotto(false);
    setMottoText("");
  };

  // Handle name editing
  const handleNameEdit = () => {
    setNameText(displayUser.username || "");
    setIsEditingName(true);
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameText.trim()) {
      updateUserName.mutate(nameText.trim());
    }
  };

  const handleNameCancel = () => {
    setIsEditingName(false);
    setNameText("");
  };

  // Remove buddy mutation
  const removeBuddy = useMutation({
    mutationFn: async (friendshipId: number) => {
      const response = await apiRequest(`/api/friends/${friendshipId}`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Buddy removed",
        description: "Buddy has been removed from your list.",
      });
      // Invalidate friends queries to update the list
      queryClient.invalidateQueries({ queryKey: ["/api/friends", targetUserId] });
      setIsConfirmRemoveOpen(false);
      setFriendToRemove(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove buddy",
        variant: "destructive",
      });
    },
  });

  // Update user name mutation
  const updateUserName = useMutation({
    mutationFn: async (newName: string) => {
      const response = await fetch(`/api/users/${displayUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: newName }),
      });

      if (!response.ok) throw new Error("Failed to update name");
      return response.json();
    },
    onSuccess: (updatedUser) => {
      toast({
        title: "Name updated!",
        description: "Your name has been updated successfully.",
      });
      // Update the user context if it's the current user
      if (isOwnProfile && updateUser) {
        updateUser(updatedUser);
      }
      // Update the query cache directly with the new user data
      queryClient.setQueryData(["/api/users", displayUser.id], updatedUser);
      // Invalidate all user-related queries to update name everywhere
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString().includes("/api/team-members") 
      });
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString().includes("/api/activities") 
      });
      setIsEditingName(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update name",
        variant: "destructive",
      });
    },
  });

  const displayUser = profileUser || user;

  if (isLoading) {
    return <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>;
  }

  if (!user || !displayUser) return null;

  const getInitials = (username: string) => {
    return username.split(' ').map(word => word[0]).join('').toUpperCase() || username.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-tactical-gray">
      <Navigation />
      
      <main className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {isOwnProfile ? "Your Profile" : `${displayUser.username}'s Profile`}
          </h1>
          <p className="text-gray-300">
            {isOwnProfile ? "Your fitness journey and achievements" : "View fitness journey and achievements"}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Info */}
          <div className="lg:col-span-1">
            <Card className="bg-tactical-gray-light border-tactical-gray overflow-hidden">
              {/* Cover Photo Section */}
              <div className="relative h-32 bg-gradient-to-r from-military-green to-steel-blue">
                {displayUser.coverPhoto ? (
                  <img
                    src={`/uploads/${displayUser.coverPhoto}`}
                    alt="Cover photo"
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-military-green to-steel-blue flex items-center justify-center">
                    <span className="text-white text-sm opacity-70">No cover photo</span>
                  </div>
                )}
                {isOwnProfile && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      className="hidden"
                      id="cover-upload"
                    />
                    <label
                      htmlFor="cover-upload"
                      className="absolute top-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full cursor-pointer transition-all"
                    >
                      {isUploadingCover ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </label>
                  </>
                )}
              </div>
              
              <CardContent className="pt-0 px-4 flex flex-col items-center relative">
                <div className="text-center w-full max-w-sm mx-auto">
                  <div className="absolute left-1/2 transform -translate-x-1/2 z-10" style={{ top: '-2rem' }}>
                    <div className="relative">
                      {displayUser.avatar ? (
                        <img
                          src={`/uploads/${displayUser.avatar}`}
                          alt="Profile picture"
                          className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-lg"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-military-green rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                          <span className="text-white font-bold text-2xl">
                            {getInitials(displayUser.username)}
                          </span>
                        </div>
                      )}
                      {isOwnProfile && (
                        <>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                            id="avatar-upload"
                          />
                          <label
                            htmlFor="avatar-upload"
                            className="absolute -bottom-1 -right-1 bg-steel-blue hover:bg-blue-600 text-white p-1.5 rounded-full cursor-pointer transition-all"
                          >
                            {isUploadingAvatar ? (
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Camera className="w-3 h-3" />
                            )}
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Spacer to push content below profile picture */}
                  <div className="h-12 mb-3"></div>
                  
                  {/* User Name */}
                  <div className="mb-2">
                    {isEditingName ? (
                      <form onSubmit={handleNameSubmit} className="flex items-center justify-center space-x-2">
                        <Input
                          value={nameText}
                          onChange={(e) => setNameText(e.target.value)}
                          placeholder="Enter your name..."
                          className="flex-1 max-w-xs bg-tactical-gray text-white placeholder-gray-400 border-tactical-gray text-center"
                          maxLength={50}
                          autoFocus
                        />
                        <Button
                          type="submit"
                          size="sm"
                          className="bg-military-green hover:bg-military-green-light text-white"
                          disabled={updateUserName.isPending || !nameText.trim()}
                        >
                          {updateUserName.isPending ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Check className="h-4 w-4 text-white" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={handleNameCancel}
                          className="text-gray-400 hover:text-white"
                        >
                          <X className="h-4 w-4 text-gray-400" />
                        </Button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-center">
                        <div className={`flex items-center ${isOwnProfile ? 'ml-12' : ''}`}>
                          <h2 className="text-white font-bold text-xl mr-2">{displayUser.username}</h2>
                          {isOwnProfile && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleNameEdit}
                              className="text-gray-400 hover:text-white"
                            >
                              <Edit2 className="h-4 w-4 text-gray-400" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mb-2 text-center">{displayUser.email}</p>
                  
                  {/* User Motto */}
                  <div className="mb-4">
                    {isEditingMotto ? (
                      <form onSubmit={handleMottoSubmit} className="flex items-center justify-center space-x-2">
                        <Input
                          value={mottoText}
                          onChange={(e) => setMottoText(e.target.value)}
                          placeholder="Enter your motto..."
                          className="flex-1 max-w-xs bg-tactical-gray text-white placeholder-gray-400 border-tactical-gray text-center"
                          maxLength={100}
                          autoFocus
                        />
                        <Button
                          type="submit"
                          size="sm"
                          className="bg-military-green hover:bg-military-green-light text-white"
                          disabled={updateUserMotto.isPending || !mottoText.trim()}
                        >
                          {updateUserMotto.isPending ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Check className="h-4 w-4 text-white" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={handleMottoCancel}
                          className="text-gray-400 hover:text-white"
                        >
                          <X className="h-4 w-4 text-gray-400" />
                        </Button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-center">
                        <div className={`flex items-center space-x-2 ${isOwnProfile ? 'ml-10' : ''}`}>
                          <p className="text-gray-300 text-sm italic text-center">
                            {displayUser.motto ? `"${displayUser.motto}"` : "No motto set"}
                          </p>
                          {isOwnProfile && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleMottoEdit}
                              className="text-gray-400 hover:text-white"
                            >
                              <Edit2 className="h-4 w-4 text-gray-400" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-tactical-gray-lighter rounded-lg p-4 mb-4 text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <Trophy className="h-5 w-5" style={{ color: '#fb923c' }} />
                      <span className="font-bold text-lg" style={{ color: '#fb923c' }}>{displayUser.points}</span>
                    </div>
                    <p className="text-gray-300 text-sm text-center">Total Points</p>
                  </div>

                  {/* Friend Actions */}
                  <div className="space-y-2 w-full">
                    {!isOwnProfile && (
                      <>
                        {/* Check relationship status and show appropriate button */}
                        {(() => {
                          const existingFriendship = friends.find((f: any) => 
                            (f.userId === user?.id && f.friendId === targetUserId) || 
                            (f.userId === targetUserId && f.friendId === user?.id)
                          );
                          
                          if (existingFriendship?.status === "accepted") {
                            return (
                              <Button 
                                onClick={() => {
                                  setSelectedFriend({
                                    id: targetUserId!,
                                    username: displayUser.username,
                                    avatar: displayUser.avatar
                                  });
                                  setIsDMModalOpen(true);
                                }}
                                className="w-full bg-steel-blue hover:bg-blue-600"
                              >
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Send Message
                              </Button>
                            );
                          } else if (existingFriendship?.status === "pending") {
                            return (
                              <Button 
                                disabled
                                className="w-full bg-gray-600 cursor-not-allowed"
                              >
                                <Clock className="mr-2 h-4 w-4" />
                                Friend Request Pending
                              </Button>
                            );
                          } else {
                            return (
                              <Button 
                                onClick={() => sendFriendRequest.mutate()}
                                disabled={sendFriendRequest.isPending}
                                className="w-full bg-military-green hover:bg-military-green-light"
                              >
                                <UserPlus className="mr-2 h-4 w-4" />
                                {sendFriendRequest.isPending ? "Sending..." : "Send Friend Request"}
                              </Button>
                            );
                          }
                        })()}
                      </>
                    )}
                    
                    {isOwnProfile && (
                      <div className="space-y-2 w-full">
                        <div className="flex gap-2 w-full">
                          <Dialog open={isFriendsModalOpen} onOpenChange={setIsFriendsModalOpen}>
                            <DialogTrigger asChild>
                              <Button className="flex-1 bg-steel-blue hover:bg-blue-600">
                                <Users className="mr-2 h-4 w-4" />
                                Buddies ({friends.filter((f: any) => f.status === "accepted").length})
                              </Button>
                            </DialogTrigger>
                          </Dialog>
                          
                          <Button 
                            onClick={() => setIsFindFriendsModalOpen(true)}
                            className="flex-1 bg-military-green hover:bg-military-green-light"
                          >
                            <Search className="mr-2 h-4 w-4" />
                            Find Buddies
                          </Button>
                        </div>
                        
                        <Dialog open={isFriendsModalOpen} onOpenChange={setIsFriendsModalOpen}>
                          <DialogContent className="bg-tactical-gray-light border-tactical-gray max-w-md">
                            <DialogHeader>
                              <DialogTitle className="text-white">Your Buddies</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="max-h-96">
                              <div className="space-y-3">
                                {friends.filter((f: any) => f.status === "accepted").length === 0 ? (
                                  <p className="text-gray-400 text-center py-8">No buddies yet</p>
                                ) : (
                                  friends.filter((f: any) => f.status === "accepted").map((friendship: any) => (
                                    <div key={friendship.id} className="flex items-center justify-between p-3 bg-tactical-gray rounded-lg">
                                      <div 
                                        className="flex items-center space-x-3 flex-1 cursor-pointer hover:bg-tactical-gray-light transition-colors rounded-lg p-2 -m-2"
                                        onClick={() => {
                                          setIsFriendsModalOpen(false);
                                          setLocation(`/profile/${friendship.friend?.id}`);
                                        }}
                                      >
                                        <Avatar className="h-10 w-10">
                                          {friendship.friend?.avatar ? (
                                            <img
                                              src={`/uploads/${friendship.friend.avatar}`}
                                              alt="Profile picture"
                                              className="w-10 h-10 rounded-full object-cover"
                                            />
                                          ) : (
                                            <AvatarFallback className="bg-military-green text-white">
                                              {friendship.friend?.username?.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                          )}
                                        </Avatar>
                                        <div>
                                          <p className="text-white font-medium hover:text-steel-blue transition-colors">{friendship.friend?.username}</p>
                                          <p className="text-gray-400 text-sm capitalize">{friendship.status}</p>
                                        </div>
                                      </div>
                                      <div className="flex space-x-2">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-steel-blue hover:bg-steel-blue hover:text-white"
                                          onClick={() => {
                                            setSelectedFriend(friendship.friend);
                                            setIsDMModalOpen(true);
                                          }}
                                        >
                                          <MessageCircle className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-red-400 hover:bg-red-500 hover:text-white"
                                          onClick={() => {
                                            setFriendToRemove(friendship);
                                            setIsConfirmRemoveOpen(true);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                        
                        {/* Friend Requests Button */}
                        {incomingRequests.length > 0 && (
                          <Dialog open={isRequestsModalOpen} onOpenChange={setIsRequestsModalOpen}>
                            <DialogTrigger asChild>
                              <Button className="w-full bg-combat-orange hover:bg-orange-600 relative">
                                <Bell className="mr-2 h-4 w-4" />
                                Friend Requests ({incomingRequests.length})
                                {incomingRequests.length > 0 && (
                                  <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1 py-0">
                                    {incomingRequests.length}
                                  </Badge>
                                )}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-tactical-gray-light border-tactical-gray max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-white">Friend Requests</DialogTitle>
                              </DialogHeader>
                              <ScrollArea className="max-h-96">
                                <div className="space-y-3">
                                  {incomingRequests.map((request: any) => (
                                    <div key={request.id} className="flex items-center justify-between p-3 bg-tactical-gray rounded-lg">
                                      <div className="flex items-center space-x-3">
                                        <Avatar className="h-10 w-10">
                                          <AvatarFallback className="bg-military-green text-white">
                                            {request.requester?.username?.charAt(0).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p className="text-white font-medium">{request.requester?.username}</p>
                                          <p className="text-gray-400 text-sm">wants to be buddies</p>
                                        </div>
                                      </div>
                                      <div className="flex space-x-2">
                                        <Button
                                          size="sm"
                                          className="bg-military-green hover:bg-military-green-light"
                                          onClick={() => handleFriendRequest.mutate({ 
                                            requestId: request.id, 
                                            status: "accepted" 
                                          })}
                                          disabled={handleFriendRequest.isPending}
                                        >
                                          <Check className="h-4 w-4 text-white" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => handleFriendRequest.mutate({ 
                                            requestId: request.id, 
                                            status: "rejected" 
                                          })}
                                          disabled={handleFriendRequest.isPending}
                                        >
                                          <X className="h-4 w-4 text-white" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats and History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Competition Participation */}
            <Card className="bg-tactical-gray-light border-tactical-gray">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-military-green" />
                  Current Competition Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentCompetition && currentTeam ? (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold text-lg">{currentCompetition.name}</h3>
                          <p className="text-gray-300 text-sm mt-1 line-clamp-2">{currentCompetition.description}</p>
                        </div>
                        <Button
                          onClick={() => window.location.href = "/competition-status"}
                          className="bg-military-green hover:bg-military-green-dark flex-shrink-0"
                          size="sm"
                        >
                          View Details
                        </Button>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-military-green text-white">
                          Team: {currentTeam.name}
                        </Badge>
                        <Badge className="bg-steel-blue text-white">
                          Role: {currentTeamMembership[0]?.role}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="bg-tactical-gray rounded-lg p-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <span className="text-gray-400 text-sm font-medium">Competition Period:</span>
                        <span className="text-white text-sm">
                          {new Date(currentCompetition.startDate).toLocaleDateString()} - {new Date(currentCompetition.endDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="flex items-center justify-center w-16 h-16 bg-tactical-gray rounded-full mx-auto mb-4">
                      <Trophy className="h-8 w-8 text-gray-500" />
                    </div>
                    <h3 className="text-white font-medium mb-2">Not Currently Participating</h3>
                    <p className="text-gray-400 text-sm">
                      {isOwnProfile ? "Join a competition to start tracking your progress" : `${displayUser.username} is not actively participating in any competitions`}
                    </p>
                    {isOwnProfile && (
                      <Button
                        onClick={() => window.location.href = "/competitions"}
                        className="mt-4 bg-military-green hover:bg-military-green-dark"
                      >
                        Browse Competitions
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Task Notifications - Only show on own profile if there are pending tasks */}
            {isOwnProfile && pendingTasks.length > 0 && (
              <Card className="bg-tactical-gray-light border-tactical-gray border-orange-500/50">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Bell className="h-5 w-5 text-orange-500" />
                    Pending Mission Tasks
                    <Badge className="bg-orange-500 text-white ml-2">
                      {pendingTasks.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Bell className="h-4 w-4 text-orange-500" />
                      <h3 className="font-semibold text-orange-100">You have {pendingTasks.length} pending {pendingTasks.length === 1 ? 'task' : 'tasks'}</h3>
                    </div>
                    <p className="text-sm text-orange-200 mb-3">
                      Your team captain has assigned tasks that need your attention.
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {pendingTasks.slice(0, 3).map((task: any) => (
                        <div key={task.id} className="flex items-center justify-between bg-orange-500/5 rounded p-2">
                          <div className="flex-1">
                            <p className="text-orange-100 font-medium text-sm">{task.title}</p>
                            {task.description && (
                              <p className="text-orange-200 text-xs mt-1">{task.description}</p>
                            )}
                            {task.dueDate && (
                              <p className="text-orange-300 text-xs mt-1">Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {pendingTasks.length > 3 && (
                        <p className="text-orange-300 text-xs text-center">And {pendingTasks.length - 3} more...</p>
                      )}
                    </div>
                    <Button
                      onClick={() => window.location.href = "/team"}
                      className="w-full mt-3 bg-orange-500 hover:bg-orange-600 text-white"
                      size="sm"
                    >
                      View All Tasks on Team Page
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Dialog open={isActivitiesModalOpen} onOpenChange={setIsActivitiesModalOpen}>
                <DialogTrigger asChild>
                  <Card className="bg-tactical-gray-light border-tactical-gray cursor-pointer hover:bg-tactical-gray transition-colors">
                    <CardContent className="p-4 text-center">
                      <Target className="mx-auto h-8 w-8 text-military-green mb-2" />
                      <div className="text-2xl font-bold text-white">{activities.length}</div>
                      <div className="text-sm text-gray-400">Activities</div>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="bg-tactical-gray-light border-tactical-gray max-w-2xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle className="text-white">Activities ({activities.length})</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-96">
                    <div className="space-y-3">
                      {activities.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">No activities yet</p>
                      ) : (
                        activities.map((activity: any) => (
                          <div key={activity.id} className="p-3 bg-tactical-gray rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-white font-medium">{activity.type}</h4>
                                <p className="text-gray-300 text-sm">{activity.description}</p>
                                <p className="text-gray-400 text-xs">Quantity: {activity.quantity}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-combat-orange font-bold">{activity.points} pts</span>
                                <p className="text-gray-400 text-xs">{new Date(activity.submittedAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              
              <Dialog open={isCompetitionsModalOpen} onOpenChange={setIsCompetitionsModalOpen}>
                <DialogTrigger asChild>
                  <Card className="bg-tactical-gray-light border-tactical-gray cursor-pointer hover:bg-tactical-gray transition-colors">
                    <CardContent className="p-4 text-center">
                      <Users className="mx-auto h-8 w-8 text-steel-blue mb-2" />
                      <div className="text-2xl font-bold text-white">{totalCompetitions}</div>
                      <div className="text-sm text-gray-400">Competitions</div>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="bg-tactical-gray-light border-tactical-gray max-w-2xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle className="text-white">Competitions ({totalCompetitions})</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-96">
                    <div className="space-y-3">
                      {totalCompetitions === 0 ? (
                        <p className="text-gray-400 text-center py-8">No competitions yet</p>
                      ) : (
                        history.map((record: any) => (
                          <div key={record.id} className="p-3 bg-tactical-gray rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-white font-medium">{record.competition?.name}</h4>
                                <p className="text-gray-300 text-sm">Team: {record.team?.name}</p>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline" className="mb-1">
                                  {record.finalRank ? `#${record.finalRank}` : "Completed"}
                                </Badge>
                                <p className="text-combat-orange text-sm font-bold">{record.pointsEarned} pts</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              
              <Dialog open={isWinsModalOpen} onOpenChange={setIsWinsModalOpen}>
                <DialogTrigger asChild>
                  <Card className="bg-tactical-gray-light border-tactical-gray cursor-pointer hover:bg-tactical-gray transition-colors">
                    <CardContent className="p-4 text-center">
                      <Trophy className="mx-auto h-8 w-8 text-combat-orange mb-2" />
                      <div className="text-2xl font-bold text-white">{wins}</div>
                      <div className="text-sm text-gray-400">Wins</div>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="bg-tactical-gray-light border-tactical-gray max-w-2xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle className="text-white">Wins ({wins})</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-96">
                    <div className="space-y-3">
                      {wins === 0 ? (
                        <p className="text-gray-400 text-center py-8">No wins yet</p>
                      ) : (
                        history.filter((record: any) => record.finalRank === 1).map((record: any) => (
                          <div key={record.id} className="p-3 bg-tactical-gray rounded-lg border border-combat-orange">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-white font-medium">{record.competition?.name}</h4>
                                <p className="text-gray-300 text-sm">Team: {record.team?.name}</p>
                              </div>
                              <div className="text-right">
                                <Badge className="bg-combat-orange text-white mb-1">
                                  🏆 1st Place
                                </Badge>
                                <p className="text-combat-orange text-sm font-bold">{record.pointsEarned} pts</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>

            {/* Strava Integration - Only show on own profile */}
            {isOwnProfile && <StravaIntegration />}

            {/* Competition History */}
            <Card className="bg-tactical-gray-light border-tactical-gray">
              <CardHeader>
                <CardTitle className="text-white">Competition History</CardTitle>
              </CardHeader>
              <CardContent>
                {totalCompetitions === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-300">No competition history yet</p>
                    <p className="text-sm text-gray-400">Join your first competition to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((record: any) => (
                      <div key={record.id} className="bg-tactical-gray-lighter rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-white font-bold">{record.competition?.name}</h3>
                            <p className="text-gray-300 text-sm">Team: {record.team?.name}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="mb-2">
                              {record.finalRank ? `#${record.finalRank}` : "Completed"}
                            </Badge>
                            <div className="text-sm text-gray-400">
                              {record.pointsEarned} points earned
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Direct Message Modal */}
      {selectedFriend && (
        <DirectMessageModal
          isOpen={isDMModalOpen}
          onClose={() => setIsDMModalOpen(false)}
          friend={selectedFriend}
        />
      )}

      {/* Find Buddies Modal */}
      <FindFriendsModal
        isOpen={isFindFriendsModalOpen}
        onClose={() => setIsFindFriendsModalOpen(false)}
      />

      {/* Remove Buddy Confirmation Dialog */}
      <Dialog open={isConfirmRemoveOpen} onOpenChange={setIsConfirmRemoveOpen}>
        <DialogContent className="bg-tactical-gray-light border-tactical-gray max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Remove Buddy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">
              Are you sure you want to remove <span className="text-white font-medium">{friendToRemove?.friend?.username}</span> from your buddies list?
            </p>
            <div className="flex space-x-3 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsConfirmRemoveOpen(false);
                  setFriendToRemove(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => removeBuddy.mutate(friendToRemove?.id)}
                disabled={removeBuddy.isPending}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {removeBuddy.isPending ? "Removing..." : "Remove Buddy"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

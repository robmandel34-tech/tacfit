import { useAuthRequired } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "wouter";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Users, Calendar, UserPlus, MessageCircle, Send, Clock, Check, X, Bell, Camera, Upload, Search, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import DirectMessageModal from "@/components/direct-message-modal";
import FindFriendsModal from "@/components/find-friends-modal";

export default function Profile() {
  const { user, isLoading } = useAuthRequired();
  const { updateUser } = useAuth();
  const { userId } = useParams();
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
    queryKey: ["/api/activities", { userId: targetUserId }],
    enabled: !!targetUserId,
  });

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
              <div className="relative h-64 bg-gradient-to-r from-military-green to-steel-blue">
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
              
              <CardContent className="pt-6 px-4 flex flex-col items-center">
                <div className="text-center w-full max-w-sm mx-auto">
                  <div className="relative inline-block mb-4" style={{ marginTop: '-7rem' }}>
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
                      <div className="flex items-center justify-center space-x-2">
                        <h2 className="text-white font-bold text-xl">{displayUser.username}</h2>
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
                      <div className="flex items-center justify-center space-x-2">
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
                                Friends ({friends.filter((f: any) => f.status === "accepted").length})
                              </Button>
                            </DialogTrigger>
                          </Dialog>
                          
                          <Button 
                            onClick={() => setIsFindFriendsModalOpen(true)}
                            className="flex-1 bg-military-green hover:bg-military-green-light"
                          >
                            <Search className="mr-2 h-4 w-4" />
                            Find Friends
                          </Button>
                        </div>
                        
                        <Dialog open={isFriendsModalOpen} onOpenChange={setIsFriendsModalOpen}>
                          <DialogContent className="bg-tactical-gray-light border-tactical-gray max-w-md">
                            <DialogHeader>
                              <DialogTitle className="text-white">Your Friends</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="max-h-96">
                              <div className="space-y-3">
                                {friends.filter((f: any) => f.status === "accepted").length === 0 ? (
                                  <p className="text-gray-400 text-center py-8">No friends yet</p>
                                ) : (
                                  friends.filter((f: any) => f.status === "accepted").map((friendship: any) => (
                                    <div key={friendship.id} className="flex items-center justify-between p-3 bg-tactical-gray rounded-lg">
                                      <div className="flex items-center space-x-3">
                                        <Avatar className="h-10 w-10">
                                          <AvatarFallback className="bg-military-green text-white">
                                            {friendship.friend?.username?.charAt(0).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p className="text-white font-medium">{friendship.friend?.username}</p>
                                          <p className="text-gray-400 text-sm capitalize">{friendship.status}</p>
                                        </div>
                                      </div>
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
                                          <p className="text-gray-400 text-sm">wants to be friends</p>
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
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-tactical-gray-light border-tactical-gray">
                <CardContent className="p-4 text-center">
                  <Target className="mx-auto h-8 w-8 text-military-green mb-2" />
                  <div className="text-2xl font-bold text-white">{activities.length}</div>
                  <div className="text-sm text-gray-400">Activities</div>
                </CardContent>
              </Card>
              
              <Card className="bg-tactical-gray-light border-tactical-gray">
                <CardContent className="p-4 text-center">
                  <Users className="mx-auto h-8 w-8 text-steel-blue mb-2" />
                  <div className="text-2xl font-bold text-white">{history.length}</div>
                  <div className="text-sm text-gray-400">Competitions</div>
                </CardContent>
              </Card>
              
              <Card className="bg-tactical-gray-light border-tactical-gray">
                <CardContent className="p-4 text-center">
                  <Trophy className="mx-auto h-8 w-8 text-combat-orange mb-2" />
                  <div className="text-2xl font-bold text-white">0</div>
                  <div className="text-sm text-gray-400">Wins</div>
                </CardContent>
              </Card>
            </div>

            {/* Competition History */}
            <Card className="bg-tactical-gray-light border-tactical-gray">
              <CardHeader>
                <CardTitle className="text-white">Competition History</CardTitle>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
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

      {/* Find Friends Modal */}
      <FindFriendsModal
        isOpen={isFindFriendsModalOpen}
        onClose={() => setIsFindFriendsModalOpen(false)}
      />
    </div>
  );
}

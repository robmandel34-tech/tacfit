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
import { Trophy, Target, Users, Calendar, UserPlus, MessageCircle, Send, Clock, Check, X, Bell, Camera, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import DirectMessageModal from "@/components/direct-message-modal";

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
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

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
                    className="w-full h-full object-cover"
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
              
              <CardHeader>
                <CardTitle className="text-white">Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="relative inline-block -mt-16 mb-4">
                    <div className="relative">
                      {displayUser.avatar ? (
                        <img
                          src={`/uploads/${displayUser.avatar}`}
                          alt="Profile picture"
                          className="w-20 h-20 rounded-full border-4 border-tactical-gray-light object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-military-green rounded-full flex items-center justify-center border-4 border-tactical-gray-light">
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
                  <h2 className="text-white font-bold text-xl mb-2">{displayUser.username}</h2>
                  <p className="text-gray-400 text-sm mb-4">{displayUser.email}</p>
                  
                  <div className="bg-tactical-gray-lighter rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <Trophy className="text-combat-orange h-5 w-5" />
                      <span className="text-combat-orange font-bold text-lg">{displayUser.points}</span>
                    </div>
                    <p className="text-gray-400 text-sm">Total Points</p>
                  </div>

                  {/* Friend Actions */}
                  <div className="space-y-2">
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
                      <div className="space-y-2">
                        <Dialog open={isFriendsModalOpen} onOpenChange={setIsFriendsModalOpen}>
                          <DialogTrigger asChild>
                            <Button className="w-full bg-steel-blue hover:bg-blue-600">
                              <Users className="mr-2 h-4 w-4" />
                              Friends ({friends.filter((f: any) => f.status === "accepted").length})
                            </Button>
                          </DialogTrigger>
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
                                          <Check className="h-4 w-4" />
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
                                          <X className="h-4 w-4" />
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
                    <Calendar className="mx-auto h-12 w-12 text-gray-500 mb-4" />
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
    </div>
  );
}

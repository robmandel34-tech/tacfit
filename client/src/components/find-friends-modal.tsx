import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, UserPlus, Users, MessageCircle, Check, X } from "lucide-react";

interface FindFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface User {
  id: number;
  username: string;
  email: string;
  avatar?: string;
  points: number;
  competitionsEntered: number;
}

interface Friendship {
  id: number;
  userId: number;
  friendId: number;
  status: string;
  createdAt: string;
  requester?: User;
  friend?: User;
}

export default function FindFriendsModal({ isOpen, onClose }: FindFriendsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isOpen,
  });

  // Fetch user's friendships
  const { data: friendships = [], isLoading: friendshipsLoading } = useQuery<Friendship[]>({
    queryKey: [`/api/friends/${user?.id}`],
    enabled: isOpen && !!user?.id,
  });

  // Fetch pending requests for this user
  const { data: pendingRequests = [], isLoading: requestsLoading } = useQuery<Friendship[]>({
    queryKey: [`/api/friends/${user?.id}/requests`],
    enabled: isOpen && !!user?.id,
  });

  // Filter users based on search query
  useEffect(() => {
    if (!users || !user || users.length === 0) return;
    
    const filtered = users
      .filter((u: User) => u.id !== user.id) // Exclude current user
      .filter((u: User) => 
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a: User, b: User) => b.points - a.points); // Sort by points descending
    
    setFilteredUsers(filtered);
  }, [users, searchQuery, user?.id]);

  // Send friend request mutation
  const sendFriendRequestMutation = useMutation({
    mutationFn: async (addresseeId: number) => {
      const response = await apiRequest("POST", "/api/friends", {
        userId: user?.id,
        friendId: addresseeId,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Buddy Request Sent!",
        description: "Your buddy request has been sent successfully.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/friends/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/friends/${user?.id}/requests`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send buddy request",
        variant: "destructive",
      });
    },
  });

  // Accept friend request mutation
  const acceptFriendRequestMutation = useMutation({
    mutationFn: async (friendshipId: number) => {
      const response = await apiRequest("PUT", `/api/friends/${friendshipId}`, {
        status: "accepted",
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Buddy Request Accepted!",
        description: "You are now buddies!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/friends/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/friends/${user?.id}/requests`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept buddy request",
        variant: "destructive",
      });
    },
  });

  // Reject friend request mutation
  const rejectFriendRequestMutation = useMutation({
    mutationFn: async (friendshipId: number) => {
      const response = await apiRequest("PUT", `/api/friends/${friendshipId}`, {
        status: "rejected",
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Buddy Request Rejected",
        description: "The buddy request has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/friends/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/friends/${user?.id}/requests`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject buddy request",
        variant: "destructive",
      });
    },
  });

  const getInitials = (username: string) => {
    return username.split(' ').map(word => word[0]).join('').toUpperCase() || username.slice(0, 2).toUpperCase();
  };

  const getFriendshipStatus = (otherUserId: number) => {
    if (!friendships || !user) return null;
    
    return friendships.find((f: Friendship) => 
      (f.userId === user.id && f.friendId === otherUserId) ||
      (f.userId === otherUserId && f.friendId === user.id)
    );
  };

  const canSendFriendRequest = (otherUserId: number) => {
    const friendship = getFriendshipStatus(otherUserId);
    return !friendship || friendship.status === "rejected";
  };

  const handleSendFriendRequest = (addresseeId: number) => {
    sendFriendRequestMutation.mutate(addresseeId);
  };

  const handleAcceptRequest = (friendshipId: number) => {
    acceptFriendRequestMutation.mutate(friendshipId);
  };

  const handleRejectRequest = (friendshipId: number) => {
    rejectFriendRequestMutation.mutate(friendshipId);
  };



  const renderFriendshipButton = (otherUser: User) => {
    const friendship = getFriendshipStatus(otherUser.id);
    
    if (!friendship) {
      return (
        <Button
          onClick={() => handleSendFriendRequest(otherUser.id)}
          disabled={sendFriendRequestMutation.isPending}
          className="bg-military-green hover:bg-military-green-light text-white"
          size="sm"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Buddy
        </Button>
      );
    }

    switch (friendship.status) {
      case "pending":
        if (friendship.userId === user?.id) {
          return (
            <Badge variant="secondary" className="text-gray-600">
              Request Sent
            </Badge>
          );
        } else {
          return (
            <div className="flex space-x-2">
              <Button
                onClick={() => handleAcceptRequest(friendship.id)}
                disabled={acceptFriendRequestMutation.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => handleRejectRequest(friendship.id)}
                disabled={rejectFriendRequestMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          );
        }
      case "accepted":
        return (
          <Button
            variant="outline"
            className="border-green-600 text-green-600 hover:bg-green-50"
            size="sm"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Message
          </Button>
        );
      case "rejected":
        return (
          <Button
            onClick={() => handleSendFriendRequest(otherUser.id)}
            disabled={sendFriendRequestMutation.isPending}
            className="bg-military-green hover:bg-military-green-light text-white"
            size="sm"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Buddy
          </Button>
        );
      default:
        return null;
    }
  };

  if (usersLoading || friendshipsLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-tactical-gray-light border-tactical-gray">
          <DialogHeader>
            <DialogTitle className="text-white">Find Buddies</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="text-white">Loading users...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-tactical-gray-light border-tactical-gray">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Find Buddies
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search users by username or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-tactical-gray border-tactical-gray text-white placeholder-gray-400"
            />
          </div>

          {/* Pending Friend Requests */}
          {pendingRequests.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-white font-semibold">Pending Buddy Requests</h3>
              {pendingRequests.map((request: Friendship) => {
                const requester = users.find((u: User) => u.id === request.userId);
                if (!requester) return null;
                
                return (
                  <Card key={request.id} className="bg-tactical-gray border-tactical-gray">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {requester.avatar ? (
                            <img
                              src={`/uploads/${requester.avatar}`}
                              alt="Profile picture"
                              className="w-10 h-10 rounded-full object-cover"
                              onError={(e) => {
                                console.error("Friend request avatar failed to load:", requester.avatar);
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                              onLoad={() => {
                                console.log("Friend request avatar loaded successfully:", requester.avatar);
                              }}
                            />
                          ) : null}
                          <div className="w-10 h-10 bg-military-green rounded-full flex items-center justify-center" style={{ display: requester.avatar ? 'none' : 'flex' }}>
                            <span className="text-white font-bold">
                              {getInitials(requester.username)}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-white font-medium">{requester.username}</h4>
                            <p className="text-gray-400 text-sm">{requester.points} points</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleAcceptRequest(request.id)}
                            disabled={acceptFriendRequestMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Accept
                          </Button>
                          <Button
                            onClick={() => handleRejectRequest(request.id)}
                            disabled={rejectFriendRequestMutation.isPending}
                            variant="outline"
                            className="border-red-600 text-red-600 hover:bg-red-50"
                            size="sm"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* All Users */}
          <div className="space-y-3">
            <h3 className="text-white font-semibold">
              All Users ({filteredUsers.length})
            </h3>
            
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-400">No users found matching your search.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredUsers.map((otherUser: User) => (
                  <Card key={otherUser.id} className="bg-tactical-gray border-tactical-gray hover:border-military-green transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          {otherUser.avatar ? (
                            <img
                              src={`/uploads/${otherUser.avatar}`}
                              alt="Profile picture"
                              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-military-green rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-bold text-sm">
                                {getInitials(otherUser.username)}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white font-medium text-lg truncate">{otherUser.username}</h4>
                            <p className="text-gray-400 text-sm truncate mb-2">{otherUser.email}</p>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="text-combat-orange border-combat-orange bg-combat-orange/10">
                                {otherUser.points} PTS
                              </Badge>
                              <Badge variant="outline" className="text-steel-blue border-steel-blue bg-steel-blue/10">
                                {otherUser.competitionsEntered || 0} Competitions
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {renderFriendshipButton(otherUser)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useAuthRequired } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "wouter";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Target, Users, Calendar, UserPlus, MessageCircle, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import DirectMessageModal from "@/components/direct-message-modal";

export default function Profile() {
  const { user, isLoading } = useAuthRequired();
  const { userId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [isDMModalOpen, setIsDMModalOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);

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

  // Get friends for the profile user
  const { data: friends = [] } = useQuery({
    queryKey: ["/api/friends", targetUserId],
    enabled: !!targetUserId,
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
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send friend request. Please try again.",
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
            <Card className="bg-tactical-gray-light border-tactical-gray">
              <CardHeader>
                <CardTitle className="text-white">Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="w-20 h-20 bg-military-green rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-white font-bold text-2xl">
                      {getInitials(displayUser.username)}
                    </span>
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
                        {/* Check if they are friends and show message button */}
                        {friends.some((f: any) => f.status === "accepted" && 
                          ((f.userId === user?.id && f.friendId === targetUserId) || 
                           (f.userId === targetUserId && f.friendId === user?.id))) ? (
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
                        ) : (
                          <Button 
                            onClick={() => sendFriendRequest.mutate()}
                            disabled={sendFriendRequest.isPending}
                            className="w-full bg-military-green hover:bg-military-green-light"
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Send Friend Request
                          </Button>
                        )}
                      </>
                    )}
                    
                    {isOwnProfile && (
                      <Dialog open={isFriendsModalOpen} onOpenChange={setIsFriendsModalOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full bg-steel-blue hover:bg-blue-600">
                            <Users className="mr-2 h-4 w-4" />
                            Friends ({friends.length})
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-tactical-gray-light border-tactical-gray max-w-md">
                          <DialogHeader>
                            <DialogTitle className="text-white">Your Friends</DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="max-h-96">
                            <div className="space-y-3">
                              {friends.length === 0 ? (
                                <p className="text-gray-400 text-center py-8">No friends yet</p>
                              ) : (
                                friends.map((friendship: any) => (
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
                                    {friendship.status === "accepted" && (
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
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
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

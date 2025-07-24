import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Phone, Search, Users, Send, Copy, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthRequired } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";

interface TeamInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
  teamName: string;
  competitionName: string;
}

export default function TeamInviteModal({ 
  isOpen, 
  onClose, 
  teamId,
  teamName,
  competitionName
}: TeamInviteModalProps) {
  const { user } = useAuthRequired();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [phoneNumber, setPhoneNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");

  // Get all users for search
  const { data: allUsers = [] } = useQuery({
    queryKey: [`/api/users`],
    enabled: searchQuery.length > 2,
  });

  // Filter users based on search query
  const searchResults = (allUsers as any[]).filter((searchUser: any) => 
    searchUser.id !== user?.id && (
      searchUser.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      searchUser.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Create phone number invitation
  const createPhoneInvitation = useMutation({
    mutationFn: async ({ phoneNumber }: { phoneNumber: string }) => {
      const response = await apiRequest("POST", `/api/teams/${teamId}/invite-phone`, {
        phoneNumber,
        invitedBy: user?.id
      });
      return response.json();
    },
    onSuccess: (data) => {
      setInviteUrl(data.inviteUrl);
      toast({
        title: "Invitation Created",
        description: `Team invitation link generated for ${phoneNumber}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create phone invitation",
        variant: "destructive",
      });
    }
  });

  // Send in-app invitation
  const sendUserInvitation = useMutation({
    mutationFn: async ({ userId }: { userId: number }) => {
      const response = await apiRequest("POST", `/api/teams/${teamId}/invite-user`, {
        userId,
        invitedBy: user?.id
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation Sent",
        description: "Team invitation sent successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}`] });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to send invitation",
        variant: "destructive",
      });
    }
  });

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }
    createPhoneInvitation.mutate({ phoneNumber });
  };

  const handleUserInvite = (userId: number) => {
    sendUserInvitation.mutate({ userId });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Invitation link copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const shareViaSMS = () => {
    const message = `Join my team "${teamName}" in the ${competitionName} competition! Click here to join: ${inviteUrl}`;
    const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, '_blank');
  };

  const resetForm = () => {
    setPhoneNumber("");
    setSearchQuery("");
    setInviteUrl("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl bg-tactical-gray border-tactical-gray-light">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite to {teamName}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="app-users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 bg-tactical-gray-light">
            <TabsTrigger value="app-users" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-military-green">
              <Search className="h-4 w-4 mr-2" />
              Search Users
            </TabsTrigger>
            <TabsTrigger value="phone" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-military-green">
              <Phone className="h-4 w-4 mr-2" />
              Phone Number
            </TabsTrigger>
          </TabsList>

          <TabsContent value="app-users" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-gray-300">
                Search for users to invite
              </Label>
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter username or email..."
                className="bg-tactical-gray-light border-tactical-gray-lighter text-white"
              />
            </div>

            {searchQuery.length > 2 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="text-center py-4">
                    <Users className="mx-auto h-8 w-8 text-gray-500 mb-2" />
                    <p className="text-gray-400">No users found</p>
                  </div>
                ) : (
                  searchResults.map((searchUser: any) => (
                    <div key={searchUser.id} className="flex items-center justify-between p-3 bg-tactical-gray-light rounded-lg border border-tactical-gray">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={searchUser.avatar ? `/uploads/${searchUser.avatar}` : undefined} />
                          <AvatarFallback className="bg-military-green text-white">
                            {getInitials(searchUser.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="text-white font-medium">{searchUser.username}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="bg-military-green text-white">
                              {searchUser.points || 0} points
                            </Badge>
                            {searchUser.motto && (
                              <p className="text-xs text-gray-400 italic">"{searchUser.motto}"</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleUserInvite(searchUser.id)}
                        disabled={sendUserInvitation.isPending}
                        className="bg-military-green hover:bg-military-green-light text-white"
                      >
                        {sendUserInvitation.isPending ? "Sending..." : "Invite"}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}

            {searchQuery.length <= 2 && (
              <div className="text-center py-8">
                <Search className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                <p className="text-gray-400">Type at least 3 characters to search</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="phone" className="space-y-4">
            {!inviteUrl ? (
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-300">
                    Friend's Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="bg-tactical-gray-light border-tactical-gray-lighter text-white"
                  />
                </div>
                
                <Button
                  type="submit"
                  disabled={createPhoneInvitation.isPending}
                  className="w-full bg-military-green hover:bg-military-green-light text-white"
                >
                  {createPhoneInvitation.isPending ? "Creating..." : "Create Invitation"}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-tactical-gray-light rounded-lg border border-tactical-gray">
                  <Label className="text-gray-300 text-sm">Invitation Link</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Input
                      value={inviteUrl}
                      readOnly
                      className="bg-tactical-gray border-tactical-gray-lighter text-white font-mono text-sm"
                    />
                    <Button
                      onClick={() => copyToClipboard(inviteUrl)}
                      size="sm"
                      variant="outline"
                      className="border-military-green text-military-green hover:bg-military-green hover:text-white"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={shareViaSMS}
                    className="flex-1 bg-military-green hover:bg-military-green-light text-white"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send SMS
                  </Button>
                  <Button
                    onClick={() => {
                      setInviteUrl("");
                      setPhoneNumber("");
                    }}
                    variant="outline"
                    className="border-tactical-gray-lighter text-gray-300 hover:bg-tactical-gray-light"
                  >
                    Create Another
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
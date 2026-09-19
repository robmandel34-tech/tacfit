import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Phone, Search, Users, Send, Copy, MessageSquare, MoonStar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthRequired } from "@/lib/auth";
import { apiRequest, uploadUrl } from "@/lib/queryClient";

interface InviteSuggestion {
  id: number;
  username: string;
  avatar: string | null;
  lastActivityAt: string | null;
  activityCount: number;
  daysQuiet: number | null;
}

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
  const [selectedSuggestions, setSelectedSuggestions] = useState<number[]>([]);

  // 2-3 buddies who have logged activities before but nothing in the last
  // 14 days — a nudge to bring them back onto a team.
  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery<InviteSuggestion[]>({
    queryKey: [`/api/teams/${teamId}/invite-suggestions`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/teams/${teamId}/invite-suggestions`);
      return res.json();
    },
    enabled: isOpen && !!teamId,
    staleTime: 60 * 1000,
  });

  const toggleSuggestion = (userId: number) => {
    setSelectedSuggestions((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  // Send invites to every selected suggestion, then close like a single invite does.
  const inviteSelectedSuggestions = useMutation({
    mutationFn: async (userIds: number[]) => {
      const results: { userId: number; ok: boolean; message?: string }[] = [];
      for (const userId of userIds) {
        try {
          const res = await apiRequest("POST", `/api/teams/${teamId}/invite-user`, {
            userId,
            invitedBy: user?.id,
          });
          results.push({ userId, ok: res.ok });
        } catch (err: any) {
          results.push({ userId, ok: false, message: err?.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const sent = results.filter((r) => r.ok);
      const failed = results.filter((r) => !r.ok);
      const nameOf = (id: number) => suggestions.find((sug) => sug.id === id)?.username || `user ${id}`;
      if (sent.length > 0) {
        toast({
          title: sent.length === 1 ? "Invitation Sent" : "Invitations Sent",
          description: `Invited ${sent.map((r) => nameOf(r.userId)).join(", ")}`,
        });
      }
      if (failed.length > 0) {
        toast({
          title: "Some invites didn't go through",
          description: failed.map((r) => nameOf(r.userId)).join(", "),
          variant: "destructive",
        });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/invite-suggestions`] });
      if (sent.length > 0) handleClose();
    },
  });

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
      handleClose();
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
    const message = competitionName
      ? `Join my team "${teamName}" in the ${competitionName} competition! Click here to join: ${inviteUrl}`
      : `Join my team "${teamName}" on Muster Up! Click here to join: ${inviteUrl}`;
    const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, '_blank');
  };

  const resetForm = () => {
    setPhoneNumber("");
    setSearchQuery("");
    setInviteUrl("");
    setSelectedSuggestions([]);
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
            Invite Buddies to {teamName}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg bg-military-green/15 border border-military-green/30 px-3 py-2 text-sm text-gray-300">
          Your buddy will join <span className="text-white font-medium">{teamName}</span>
          {competitionName && (
            <> in the <span className="text-white font-medium">{competitionName}</span> competition</>
          )}
          .
        </div>

        <Tabs defaultValue="app-users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 bg-tactical-gray-light">
            <TabsTrigger value="app-users" className="text-gray-300 data-[state=active]:text-forest-green data-[state=active]:bg-military-green">
              <Search className="h-4 w-4 mr-2" />
              Search Users
            </TabsTrigger>
            <TabsTrigger value="phone" className="text-gray-300 data-[state=active]:text-forest-green data-[state=active]:bg-military-green">
              <Phone className="h-4 w-4 mr-2" />
              Phone Number
            </TabsTrigger>
          </TabsList>

          <TabsContent value="app-users" className="space-y-4">
            {(suggestionsLoading || suggestions.length > 0) && (
              <div
                className="rounded-lg border border-steel-blue/40 bg-steel-blue/10 p-3 space-y-3"
                data-testid="section-invite-suggestions"
              >
                <div className="flex items-start gap-2">
                  <MoonStar className="h-4 w-4 text-steel-blue mt-0.5 shrink-0" />
                  <div>
                    <p className="text-white text-sm font-semibold">Buddies who've gone quiet</p>
                    <p className="text-gray-400 text-xs">
                      They've logged activities before but nothing in the last 14 days. Pick who to bring back.
                    </p>
                  </div>
                </div>

                {suggestionsLoading ? (
                  <p className="text-gray-400 text-xs">Finding buddies...</p>
                ) : (
                  <div className="space-y-2">
                    {suggestions.map((sug) => {
                      const checked = selectedSuggestions.includes(sug.id);
                      return (
                        <label
                          key={sug.id}
                          className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                            checked
                              ? "border-military-green bg-military-green/10"
                              : "border-tactical-gray bg-tactical-gray-light hover:border-tactical-gray-lighter"
                          }`}
                          data-testid={`row-invite-suggestion-${sug.id}`}
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleSuggestion(sug.id)}
                            className="border-gray-500 data-[state=checked]:bg-military-green data-[state=checked]:border-military-green"
                          />
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={sug.avatar ? uploadUrl(sug.avatar) : undefined} />
                            <AvatarFallback className="bg-military-green text-forest-green text-xs">
                              {getInitials(sug.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-white text-sm font-medium truncate">{sug.username}</p>
                            <p className="text-gray-400 text-xs">
                              {sug.activityCount} {sug.activityCount === 1 ? "activity" : "activities"} logged
                              {sug.daysQuiet !== null ? ` · quiet for ${sug.daysQuiet} days` : ""}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                    <Button
                      size="sm"
                      onClick={() => inviteSelectedSuggestions.mutate(selectedSuggestions)}
                      disabled={selectedSuggestions.length === 0 || inviteSelectedSuggestions.isPending}
                      className="w-full bg-military-green hover:bg-military-green-light text-forest-green"
                      data-testid="button-invite-selected"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {inviteSelectedSuggestions.isPending
                        ? "Sending..."
                        : selectedSuggestions.length > 0
                        ? `Invite ${selectedSuggestions.length} selected`
                        : "Select buddies to invite"}
                    </Button>
                  </div>
                )}
              </div>
            )}

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
                          <AvatarImage src={searchUser.avatar ? uploadUrl(searchUser.avatar) : undefined} />
                          <AvatarFallback className="bg-military-green text-forest-green">
                            {getInitials(searchUser.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="text-white font-medium">{searchUser.username}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="bg-military-green text-forest-green">
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
                        className="bg-military-green hover:bg-military-green-light text-forest-green"
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
                  className="w-full bg-military-green hover:bg-military-green-light text-forest-green"
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
                    className="flex-1 bg-military-green hover:bg-military-green-light text-forest-green"
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
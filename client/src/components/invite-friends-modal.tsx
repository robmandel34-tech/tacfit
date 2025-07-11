import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Share2, Copy, MessageCircle, X } from "lucide-react";

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  competitionId: number;
  competitionName: string;
}

export default function InviteFriendsModal({ 
  isOpen, 
  onClose, 
  competitionId, 
  competitionName 
}: InviteFriendsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");

  const createInvitation = useMutation({
    mutationFn: async ({ phoneNumber }: { phoneNumber: string }) => {
      const response = await apiRequest("POST", `/api/competitions/${competitionId}/invite`, {
        phoneNumber,
        invitedBy: user?.id
      });
      return response.json();
    },
    onSuccess: (data) => {
      setInviteUrl(data.inviteUrl);
      toast({
        title: "Invitation Created",
        description: `Invitation link generated for ${phoneNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/competitions'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create invitation",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }
    createInvitation.mutate({ phoneNumber });
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
    const message = `Join me in the ${competitionName} fitness competition! Click here to register: ${inviteUrl}`;
    const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, '_blank');
  };

  const resetForm = () => {
    setPhoneNumber("");
    setInviteUrl("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-tactical-gray border-tactical-gray-light">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Invite Friends to {competitionName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!inviteUrl ? (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                disabled={createInvitation.isPending}
                className="w-full sharp-button bg-military-green hover:bg-military-green-dark"
              >
                {createInvitation.isPending ? "Creating..." : "Create Invitation"}
              </Button>
            </form>
          ) : (
            <Card className="sharp-card bg-tactical-gray-light border-tactical-gray-lighter">
              <CardHeader>
                <CardTitle className="text-white text-sm">
                  Invitation Created Successfully!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-gray-300 text-xs">
                    Invitation Link
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={inviteUrl}
                      readOnly
                      className="bg-tactical-gray border-tactical-gray-lighter text-white text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(inviteUrl)}
                      className="sharp-button bg-military-green hover:bg-military-green-dark"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={shareViaSMS}
                    className="flex-1 sharp-button bg-military-green hover:bg-military-green-dark"
                    size="sm"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send SMS
                  </Button>
                  <Button
                    onClick={resetForm}
                    variant="outline"
                    className="sharp-button border-tactical-gray-lighter text-white hover:bg-tactical-gray-light"
                    size="sm"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>

                <div className="text-xs text-gray-400 mt-2">
                  💡 Your friend will get their first competition free! 
                  After that, they'll need to pay to join additional competitions.
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
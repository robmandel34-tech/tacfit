import { useState } from "react";
import { useLocation } from "wouter";
import { useAuthRequired } from "@/lib/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Settings,
  Lock,
  Bell,
  Eye,
  Trash2,
  FileText,
  Shield,
  Mail,
  Bug,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuthRequired();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const changePassword = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/users/${user?.id}/change-password`, {
        currentPassword,
        newPassword,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password updated", description: "Your password has been changed." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const togglePrivacy = useMutation({
    mutationFn: async (profilePublic: boolean) => {
      const res = await apiRequest("PATCH", `/api/users/${user?.id}/privacy`, { profilePublic });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id] });
    },
    onError: () => toast({ title: "Error", description: "Could not update privacy setting.", variant: "destructive" }),
  });

  const toggleNotifications = useMutation({
    mutationFn: async (pushNotificationsEnabled: boolean) => {
      const res = await apiRequest("PATCH", `/api/users/${user?.id}/notifications`, { pushNotificationsEnabled });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id] });
    },
    onError: () => toast({ title: "Error", description: "Could not update notification setting.", variant: "destructive" }),
  });

  const deleteAccount = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/auth/account", {
        userId: user?.id,
        password: deletePassword,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      setDeleteDialogOpen(false);
      queryClient.clear();
      setLocation("/login");
    },
    onError: (err: Error) => {
      // Keep dialog open so user can try again
      toast({ title: "Could not delete account", description: err.message, variant: "destructive" });
    },
  });

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "Missing fields", description: "Please fill in all password fields.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "New password and confirm password must match.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    changePassword.mutate();
  };

  if (!user) return null;

  const isPublic = (user as any).profilePublic !== false;
  const notificationsOn = (user as any).pushNotificationsEnabled !== false;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(to bottom, #0a0a0a, #111)" }}>
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-2xl pb-24">
        <div className="mb-8 flex items-center gap-3">
          <Settings className="h-7 w-7 text-military-green" />
          <div>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
            <p className="text-gray-400 text-sm">Manage your account and preferences</p>
          </div>
        </div>

        <div className="space-y-4">

          {/* ── Change Password ── */}
          <Card className="bg-white/5 border-white/10 rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Lock className="h-4 w-4 text-military-green" /> Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-gray-300 text-sm">Current Password</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={changePassword.isPending}
                className="w-full bg-military-green hover:bg-military-green/80 text-white mt-1"
              >
                {changePassword.isPending ? "Updating..." : "Update Password"}
              </Button>
            </CardContent>
          </Card>

          {/* ── Notifications ── */}
          <Card className="bg-white/5 border-white/10 rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Bell className="h-4 w-4 text-military-green" /> Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">Push Notifications</p>
                  <p className="text-gray-400 text-xs mt-0.5">Activity updates, team messages, competition events</p>
                </div>
                <Switch
                  checked={notificationsOn}
                  onCheckedChange={val => toggleNotifications.mutate(val)}
                  disabled={toggleNotifications.isPending}
                  className="data-[state=checked]:bg-military-green"
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Privacy ── */}
          <Card className="bg-white/5 border-white/10 rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Eye className="h-4 w-4 text-military-green" /> Privacy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-sm font-medium">Public Profile</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {isPublic ? "Anyone can view your profile and activities" : "Only your team and buddies can view your profile"}
                  </p>
                </div>
                <Switch
                  checked={isPublic}
                  onCheckedChange={val => togglePrivacy.mutate(val)}
                  disabled={togglePrivacy.isPending}
                  className="data-[state=checked]:bg-military-green"
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Legal ── */}
          <Card className="bg-white/5 border-white/10 rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-military-green" /> Legal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-0">
              <a
                href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-6 py-3 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-white text-sm">Terms of Service</span>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-500" />
              </a>
              <div className="border-t border-white/5" />
              <a
                href="https://www.privacypolicies.com/live/tacfit"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-6 py-3 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-gray-400" />
                  <span className="text-white text-sm">Privacy Policy</span>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-500" />
              </a>
            </CardContent>
          </Card>

          {/* ── Support ── */}
          <Card className="bg-white/5 border-white/10 rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Mail className="h-4 w-4 text-military-green" /> Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-0">
              <a
                href="mailto:support@tacfit.app?subject=TacFit%20Feedback"
                className="flex items-center justify-between px-6 py-3 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-white text-sm">Contact / Feedback</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </a>
              <div className="border-t border-white/5" />
              <a
                href="mailto:support@tacfit.app?subject=TacFit%20Bug%20Report&body=Describe%20the%20bug%20here%3A%0A%0ASteps%20to%20reproduce%3A%0A1.%20%0A2.%20%0A3.%20%0A%0AExpected%20behavior%3A%0A%0AActual%20behavior%3A"
                className="flex items-center justify-between px-6 py-3 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bug className="h-4 w-4 text-gray-400" />
                  <span className="text-white text-sm">Report a Bug</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </a>
            </CardContent>
          </Card>

          {/* ── Delete Account ── */}
          <Card className="bg-red-950/20 border-red-900/30 rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-red-400 flex items-center gap-2 text-base">
                <Trash2 className="h-4 w-4" /> Delete Account
              </CardTitle>
              <CardDescription className="text-gray-400 text-xs">
                Permanently deletes your account, all activities, and competition history. This cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                className="w-full bg-red-900/50 hover:bg-red-800 border border-red-700 text-red-200"
                onClick={() => { setDeletePassword(""); setDeleteDialogOpen(true); }}
              >
                Delete My Account
              </Button>

              <Dialog open={deleteDialogOpen} onOpenChange={open => { if (!deleteAccount.isPending) setDeleteDialogOpen(open); }}>
                <DialogContent className="bg-[#111] border-white/10 text-white max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-white text-lg">Delete your account?</DialogTitle>
                    <DialogDescription className="text-gray-400 text-sm">
                      This permanently deletes your account, all activities, points, and competition history. <span className="text-red-400 font-semibold">This cannot be undone.</span>
                    </DialogDescription>
                  </DialogHeader>

                  <div className="py-1">
                    <Label className="text-gray-300 text-sm">Enter your password to confirm</Label>
                    <Input
                      type="password"
                      value={deletePassword}
                      onChange={e => setDeletePassword(e.target.value)}
                      placeholder="Your password"
                      className="mt-2 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                      onKeyDown={e => { if (e.key === "Enter" && deletePassword && !deleteAccount.isPending) deleteAccount.mutate(); }}
                    />
                  </div>

                  <DialogFooter className="gap-2 flex-row">
                    <Button
                      variant="outline"
                      className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                      onClick={() => setDeleteDialogOpen(false)}
                      disabled={deleteAccount.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-red-700 hover:bg-red-600 text-white border-0"
                      onClick={() => deleteAccount.mutate()}
                      disabled={!deletePassword || deleteAccount.isPending}
                    >
                      {deleteAccount.isPending ? "Deleting…" : "Yes, delete it"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <p className="text-center text-gray-600 text-xs pb-4">TacFit · Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
}

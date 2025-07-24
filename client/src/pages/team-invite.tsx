import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Trophy, Star, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PhoneInvitation {
  id: number;
  phoneNumber: string;
  invitedBy: number;
  teamId: number;
  competitionId: number;
  inviteToken: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  inviter?: {
    username: string;
    avatar?: string;
  };
  team?: {
    name: string;
    motto?: string;
  };
  competition?: {
    name: string;
    description?: string;
  };
}

export default function TeamInvite() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { user, register } = useAuth();
  const { toast } = useToast();
  
  const [invitation, setInvitation] = useState<PhoneInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const response = await fetch(`/api/team-invitations/${token}`);
        if (response.ok) {
          const inviteData = await response.json();
          setInvitation(inviteData);
        } else {
          toast({
            title: "Invalid Invitation",
            description: "This invitation link is invalid or has expired.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load invitation details.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchInvitation();
    }
  }, [token, toast]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    setRegistering(true);
    try {
      // Register with phone number to trigger referral system
      await register(
        formData.username, 
        formData.email, 
        formData.password,
        invitation?.phoneNumber
      );
      
      toast({
        title: "Account Created!",
        description: `Welcome to TacFit! You've been invited to join ${invitation?.team?.name}.`,
      });
      
      // User will be redirected to dashboard by auth system
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRegistering(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!user || !invitation) return;
    
    try {
      // Join the team that invited them
      const response = await fetch(`/api/teams/${invitation.teamId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      
      if (response.ok) {
        toast({
          title: "Joined Team!",
          description: `You've successfully joined ${invitation.team?.name}.`,
        });
        setLocation(`/team`);
      } else {
        throw new Error("Failed to join team");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to join team. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-military-green border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
        <Card className="sharp-card bg-tactical-gray-light border-tactical-gray-lighter max-w-md">
          <CardContent className="p-6 text-center">
            <Trophy className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              Invitation Not Found
            </h2>
            <p className="text-gray-300 mb-4">
              This invitation link is invalid or has expired.
            </p>
            <Button 
              onClick={() => setLocation("/")}
              className="sharp-button bg-military-green hover:bg-military-green-dark"
            >
              Go to TacFit
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = new Date() > new Date(invitation.expiresAt);

  if (isExpired) {
    return (
      <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
        <Card className="sharp-card bg-tactical-gray-light border-tactical-gray-lighter max-w-md">
          <CardContent className="p-6 text-center">
            <Trophy className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              Invitation Expired
            </h2>
            <p className="text-gray-300 mb-4">
              This invitation has expired. Contact {invitation.inviter?.username} for a new invitation.
            </p>
            <Button 
              onClick={() => setLocation("/")}
              className="sharp-button bg-military-green hover:bg-military-green-dark"
            >
              Go to TacFit
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
        <Card className="sharp-card bg-tactical-gray-light border-tactical-gray-lighter max-w-md">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-6 w-6 text-military-green" />
              Join {invitation.team?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-military-green/20 rounded-full mx-auto mb-4">
                <Star className="h-8 w-8 text-military-green" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                You're Invited!
              </h3>
              <p className="text-gray-300 mb-4">
                {invitation.inviter?.username} invited you to join their team in {invitation.competition?.name}.
              </p>
              
              {invitation.team?.motto && (
                <div className="bg-tactical-gray p-3 rounded mb-4">
                  <p className="text-military-green font-medium">Team Motto</p>
                  <p className="text-gray-300 italic">"{invitation.team.motto}"</p>
                </div>
              )}
              
              <Button 
                onClick={handleJoinTeam}
                className="w-full sharp-button bg-military-green hover:bg-military-green-dark"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Join Team
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tactical-gray flex items-center justify-center p-4">
      <Card className="sharp-card bg-tactical-gray-light border-tactical-gray-lighter max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-military-green" />
            Join the Force
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center w-16 h-16 bg-military-green/20 rounded-full mx-auto mb-4">
              <Star className="h-8 w-8 text-military-green" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              You're Invited to {invitation.team?.name}!
            </h3>
            <p className="text-gray-300 mb-2">
              {invitation.inviter?.username} invited you to join their team
            </p>
            <p className="text-sm text-gray-400">
              Competition: {invitation.competition?.name}
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label htmlFor="username" className="text-gray-300">
                Choose your callsign
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="sharp-input bg-tactical-gray border-tactical-gray-lighter text-white"
                placeholder="Your tactical callsign"
                required
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-gray-300">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="sharp-input bg-tactical-gray border-tactical-gray-lighter text-white"
                placeholder="your.email@example.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-300">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="sharp-input bg-tactical-gray border-tactical-gray-lighter text-white"
                placeholder="Enter secure password"
                required
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-gray-300">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="sharp-input bg-tactical-gray border-tactical-gray-lighter text-white"
                placeholder="Confirm your password"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full sharp-button bg-military-green hover:bg-military-green-dark"
              disabled={registering}
            >
              {registering ? "Creating Account..." : "Join the Force"}
            </Button>
          </form>

          <div className="text-center pt-4">
            <p className="text-sm text-gray-400">
              Already have an account?{" "}
              <button
                onClick={() => setLocation("/login")}
                className="text-military-green hover:underline"
              >
                Sign in here
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
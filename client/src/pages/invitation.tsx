import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crosshair, Trophy, Clock, Users, AlertCircle } from "lucide-react";
import { useLocation, useRoute } from "wouter";

export default function Invitation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/invite/:token");
  const token = params?.token;

  const { data: invitation, isLoading } = useQuery({
    queryKey: [`/api/invitations/${token}`],
    enabled: !!token,
  });

  const acceptInvitation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/invitations/${token}/accept`, {
        userId: user?.id
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.requiresPayment) {
        toast({
          title: "Payment Required",
          description: "This competition requires payment. You'll be redirected to payment.",
        });
        // TODO: Redirect to payment page
        setLocation("/competitions");
      } else {
        toast({
          title: "Success!",
          description: "You've joined the competition! Your first competition is free.",
        });
        setLocation("/competitions");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept invitation",
        variant: "destructive",
      });
    }
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
        <Card className="sharp-card bg-tactical-gray-light border-tactical-gray-lighter max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Invalid Invitation</h2>
            <p className="text-gray-300">The invitation link is invalid or missing.</p>
            <Button 
              onClick={() => setLocation("/")}
              className="mt-4 sharp-button bg-military-green hover:bg-military-green-dark"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
        <div className="text-white">Loading invitation...</div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
        <Card className="sharp-card bg-tactical-gray-light border-tactical-gray-lighter max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Invitation Not Found</h2>
            <p className="text-gray-300">This invitation may have expired or been removed.</p>
            <Button 
              onClick={() => setLocation("/")}
              className="mt-4 sharp-button bg-military-green hover:bg-military-green-dark"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
        <Card className="sharp-card bg-tactical-gray-light border-tactical-gray-lighter max-w-md">
          <CardContent className="p-6 text-center">
            <Trophy className="h-12 w-12 text-military-green mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              You're Invited to {invitation.competition?.name}!
            </h2>
            <p className="text-gray-300 mb-4">
              You need to create an account or log in to accept this invitation.
            </p>
            <div className="space-y-2">
              <Button 
                onClick={() => setLocation("/register")}
                className="w-full sharp-button bg-military-green hover:bg-military-green-dark"
              >
                Create Account
              </Button>
              <Button 
                onClick={() => setLocation("/login")}
                variant="outline"
                className="w-full sharp-button border-tactical-gray-lighter text-white hover:bg-tactical-gray-light"
              >
                Log In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const competition = invitation.competition;
  const isExpired = new Date() > new Date(invitation.expiresAt);

  return (
    <div className="min-h-screen bg-tactical-gray">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-military-green-dark to-military-green rounded-none p-6 text-white mb-6">
              <Crosshair className="h-16 w-16 mx-auto mb-4 text-military-green-light" />
              <h1 className="text-3xl font-bold mb-2">Mission Invitation</h1>
              <p className="text-gray-200">You've been invited to join a tactical fitness challenge</p>
            </div>
          </div>

          {/* Competition Details */}
          <Card className="sharp-card bg-tactical-gray-light border-tactical-gray-lighter mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                {competition?.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-300">{competition?.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Clock className="h-4 w-4" />
                  <span>Starts: {competition?.startDate ? new Date(competition.startDate).toLocaleDateString() : "TBD"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Users className="h-4 w-4" />
                  <span>Max Teams: {competition?.maxTeams}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-military-green text-white">
                  {invitation.status}
                </Badge>
                {isExpired && (
                  <Badge variant="destructive">
                    Expired
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Invitation Details */}
          <Card className="sharp-card bg-tactical-gray-light border-tactical-gray-lighter mb-6">
            <CardHeader>
              <CardTitle className="text-white text-sm">Invitation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-gray-300">
                <strong>Invited by:</strong> Squad Leader
              </p>
              <p className="text-gray-300">
                <strong>Expires:</strong> {new Date(invitation.expiresAt).toLocaleDateString()}
              </p>
              <p className="text-gray-300">
                <strong>Status:</strong> {invitation.status}
              </p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="text-center space-y-4">
            {isExpired ? (
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-300 mb-4">This invitation has expired.</p>
                <Button 
                  onClick={() => setLocation("/")}
                  className="sharp-button bg-military-green hover:bg-military-green-dark"
                >
                  Go to Dashboard
                </Button>
              </div>
            ) : invitation.status === "accepted" ? (
              <div className="text-center">
                <Trophy className="h-12 w-12 text-military-green mx-auto mb-4" />
                <p className="text-gray-300 mb-4">You've already accepted this invitation!</p>
                <Button 
                  onClick={() => setLocation("/competitions")}
                  className="sharp-button bg-military-green hover:bg-military-green-dark"
                >
                  View Competitions
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-military-green/20 border border-military-green/50 rounded-lg p-4">
                  <p className="text-military-green-light text-sm font-medium">
                    🎯 First Competition Free!
                  </p>
                  <p className="text-gray-300 text-sm">
                    Your first competition entry is completely free. After that, you'll need to pay to join additional competitions.
                  </p>
                </div>
                
                <Button
                  onClick={() => acceptInvitation.mutate()}
                  disabled={acceptInvitation.isPending}
                  className="w-full sharp-button bg-military-green hover:bg-military-green-dark text-lg py-3"
                >
                  {acceptInvitation.isPending ? "Accepting..." : "Accept Mission"}
                </Button>
                
                <Button
                  onClick={() => setLocation("/")}
                  variant="outline"
                  className="w-full sharp-button border-tactical-gray-lighter text-white hover:bg-tactical-gray-light"
                >
                  Decline
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
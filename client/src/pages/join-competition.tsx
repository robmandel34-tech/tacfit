import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { API_BASE } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crosshair, Trophy, Clock, Users, AlertCircle, Lock } from "lucide-react";
import TeamSelectionModal from "@/components/team-selection-modal";
import CompetitionPaymentModal from "@/components/competition-payment-modal";

export default function JoinCompetition() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/join/:code");
  const code = params?.code;

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [teamSelectionModalOpen, setTeamSelectionModalOpen] = useState(false);

  const { data: competition, isLoading, isError } = useQuery<any>({
    queryKey: ["/api/competitions/by-code", code],
    queryFn: () =>
      fetch(`${API_BASE}/api/competitions/by-code/${code}`, { credentials: "include" }).then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      }),
    enabled: !!code,
    retry: false,
  });

  const handleJoin = () => {
    if (!competition) return;
    const isPaid = competition.paymentType && competition.paymentType !== "free";
    if (isPaid) {
      setPaymentModalOpen(true);
    } else {
      setTeamSelectionModalOpen(true);
      setTimeout(() => {
        toast({
          title: "Choose Your Squad",
          description: "Select a team to join or create a new one to complete your entry",
        });
      }, 400);
    }
  };

  const isCompleted = competition?.isCompleted;

  if (!code) {
    return (
      <Centered>
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Invalid Link</h2>
        <p className="text-gray-300">This invite link is invalid or missing.</p>
        <Button onClick={() => setLocation("/")} className="mt-4 bg-military-green hover:bg-military-green-dark text-forest-green">
          Go to Dashboard
        </Button>
      </Centered>
    );
  }

  if (isLoading) {
    return <Centered><div className="text-white">Loading invitation...</div></Centered>;
  }

  if (isError || !competition) {
    return (
      <Centered>
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Competition Not Found</h2>
        <p className="text-gray-300">This invite link is invalid or the competition was removed.</p>
        <Button onClick={() => setLocation("/")} className="mt-4 bg-military-green hover:bg-military-green-dark text-forest-green">
          Go to Dashboard
        </Button>
      </Centered>
    );
  }

  if (!user) {
    return (
      <Centered>
        <Trophy className="h-12 w-12 text-military-green mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">You're Invited to {competition.name}!</h2>
        <p className="text-gray-300 mb-4">Create an account or log in to join this private competition.</p>
        <div className="space-y-2">
          <Button onClick={() => setLocation("/register")} className="w-full bg-military-green hover:bg-military-green-dark text-forest-green">
            Create Account
          </Button>
          <Button onClick={() => setLocation("/login")} variant="outline" className="w-full border-tactical-gray-lighter text-white hover:bg-tactical-gray-light">
            Log In
          </Button>
        </div>
        <p className="text-gray-500 text-xs mt-4">After logging in, open this link again to join.</p>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen bg-tactical-gray">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="card-hero-green p-6 text-white mb-6">
              <Crosshair className="h-16 w-16 mx-auto mb-4 text-military-green-light" />
              <h1 className="text-3xl font-bold mb-2">Private Invitation</h1>
              <p className="text-gray-200">You've been invited to join this tactical fitness challenge</p>
            </div>
          </div>

          <Card className="bg-tactical-gray-light border-tactical-gray-lighter mb-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                {competition.name}
                <Badge variant="secondary" className="bg-military-green/30 text-military-green-light gap-1 ml-1">
                  <Lock className="h-3 w-3" /> Private
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {competition.description && <p className="text-gray-300">{competition.description}</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Clock className="h-4 w-4" />
                  <span>Starts: {competition.startDate ? new Date(competition.startDate).toLocaleDateString() : "TBD"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Users className="h-4 w-4" />
                  <span>Max Teams: {competition.maxTeams}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center space-y-4">
            {isCompleted ? (
              <div>
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-300 mb-4">This competition has already ended.</p>
                <Button onClick={() => setLocation("/competitions")} className="bg-military-green hover:bg-military-green-dark text-forest-green">
                  View Competitions
                </Button>
              </div>
            ) : (
              <>
                <Button
                  onClick={handleJoin}
                  className="w-full bg-military-green hover:bg-military-green-dark text-lg py-3 text-forest-green"
                >
                  Join Competition
                </Button>
                <Button onClick={() => setLocation("/")} variant="outline" className="w-full border-tactical-gray-lighter text-white hover:bg-tactical-gray-light">
                  Not now
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <CompetitionPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        competition={competition}
        onPaymentSuccess={() => {
          setPaymentModalOpen(false);
          setTeamSelectionModalOpen(true);
          setTimeout(() => {
            toast({ title: "Choose Your Squad", description: "Select a team to join or create a new one to complete your entry" });
          }, 400);
        }}
      />

      <TeamSelectionModal
        isOpen={teamSelectionModalOpen}
        onClose={() => setTeamSelectionModalOpen(false)}
        competitionId={competition.id}
        competitionName={competition.name}
        onJoined={() => setLocation("/team")}
      />
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-tactical-gray flex items-center justify-center p-4">
      <Card className="bg-tactical-gray-light border-tactical-gray-lighter max-w-md w-full">
        <CardContent className="p-6 text-center">{children}</CardContent>
      </Card>
    </div>
  );
}

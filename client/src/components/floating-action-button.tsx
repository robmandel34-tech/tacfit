import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import ActivitySubmissionModal from "@/components/activity-submission-modal";

export default function FloatingActionButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();

  // Always call hooks in the same order
  const { data: userTeamMembership } = useQuery({
    queryKey: [`/api/team-members/${user?.id}`],
    enabled: !!user?.id,
  });

  // Get the competition ID from the first team membership
  const competitionId = Array.isArray(userTeamMembership) && userTeamMembership.length > 0 
    ? (userTeamMembership[0] as any)?.team?.competitionId 
    : null;

  const { data: currentCompetition } = useQuery({
    queryKey: [`/api/competitions/${competitionId}`],
    enabled: !!competitionId,
  });

  // Don't show the button if user is not authenticated
  if (!user) return null;

  // Check if the competition is active
  const isCompetitionActive = () => {
    if (!currentCompetition || typeof currentCompetition !== 'object') return false;
    
    const competition = currentCompetition as any;
    const now = new Date();
    const startDate = new Date(competition.startDate);
    const endDate = new Date(competition.endDate);
    
    return now >= startDate && now <= endDate;
  };

  const canSubmitActivity = isCompetitionActive();

  return (
    <>
      <Button
        onClick={() => canSubmitActivity && setIsModalOpen(true)}
        disabled={!canSubmitActivity}
        className={`fixed bottom-28 right-6 w-14 h-14 rounded-full shadow-2xl z-50 border-2 border-white/50 transition-all duration-300 ${
          canSubmitActivity 
            ? 'bg-military-green/90 hover:bg-military-green-light/90 hover:scale-110 backdrop-blur-sm cursor-pointer' 
            : 'bg-gray-500/60 cursor-not-allowed opacity-50'
        }`}
        size="icon"
      >
        <svg
          className="h-6 w-6 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          {/* Crosshair circle */}
          <circle cx="12" cy="12" r="4" />
          {/* Crosshair lines extending out */}
          <line x1="12" y1="2" x2="12" y2="8" />
          <line x1="12" y1="16" x2="12" y2="22" />
          <line x1="2" y1="12" x2="8" y2="12" />
          <line x1="16" y1="12" x2="22" y2="12" />
        </svg>
      </Button>

      {canSubmitActivity && (
        <ActivitySubmissionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
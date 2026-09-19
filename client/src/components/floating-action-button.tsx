import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Target, MapPin, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAppleHealth } from "@/hooks/use-apple-health";
import ActivitySubmissionModal from "@/components/activity-submission-modal";
import { OPEN_ACTIVITY_SUBMISSION_EVENT } from "@/components/onboarding-walkthrough";

interface TravelPromptWorkout {
  healthKitWorkoutId: string;
  activityType: string;
  startTime: string;
  endTime: string;
  durationSec: number | null;
  distanceMeters: number | null;
}

const TRAVEL_DISMISS_KEY = "travel-prompt-dismissed";

export default function FloatingActionButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [promptWorkoutId, setPromptWorkoutId] = useState<string | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(
    () => localStorage.getItem(TRAVEL_DISMISS_KEY),
  );
  const { user } = useAuth();
  const [location] = useLocation();
  const appleHealth = useAppleHealth();

  // Always call hooks in the same order - but only enable queries when user exists
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

  // Newest unposted traveling workout (run/walk/ride/hike) from Apple Health,
  // finished within the last 48 hours — surfaced as a "post it" prompt banner.
  const { data: travelPrompt = null } = useQuery<TravelPromptWorkout | null>({
    queryKey: ["/api/apple-health/travel-prompt"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/apple-health/travel-prompt");
      return res.json();
    },
    enabled: !!user && appleHealth.native && appleHealth.connected,
    staleTime: 5 * 60 * 1000,
  });

  // Other surfaces (e.g. the onboarding "submit your first activity" choice)
  // can ask us to open the submission modal without owning it themselves.
  useEffect(() => {
    const open = () => setIsModalOpen(true);
    window.addEventListener(OPEN_ACTIVITY_SUBMISSION_EVENT, open);
    return () => window.removeEventListener(OPEN_ACTIVITY_SUBMISSION_EVENT, open);
  }, []);

  // Don't show the button if user is not authenticated - moved after all hooks
  if (!user) return null;

  // Hide during video calls so the meeting fills the whole screen
  if (location.startsWith("/call/")) return null;

  // Check if the competition is active (for display purposes only)
  const isCompetitionActive = () => {
    if (!currentCompetition || typeof currentCompetition !== 'object') return false;
    
    const competition = currentCompetition as any;
    const now = new Date();
    const startDate = new Date(competition.startDate);
    const endDate = new Date(competition.endDate);
    
    return now >= startDate && now <= endDate;
  };

  // Users can always submit activities now - they get individual points regardless of competition status
  const canSubmitActivity = true;

  const showTravelBanner =
    travelPrompt && travelPrompt.healthKitWorkoutId !== dismissedId && !isModalOpen;

  const travelSummary = travelPrompt
    ? [
        travelPrompt.activityType,
        travelPrompt.durationSec ? `${Math.max(1, Math.round(travelPrompt.durationSec / 60))} min` : null,
        travelPrompt.distanceMeters && travelPrompt.distanceMeters > 0
          ? `${(travelPrompt.distanceMeters / 1000).toFixed(1)} km`
          : null,
      ].filter(Boolean).join(" · ")
    : "";

  const dismissTravelPrompt = () => {
    if (!travelPrompt) return;
    localStorage.setItem(TRAVEL_DISMISS_KEY, travelPrompt.healthKitWorkoutId);
    setDismissedId(travelPrompt.healthKitWorkoutId);
  };

  const postTravelWorkout = () => {
    if (!travelPrompt) return;
    setPromptWorkoutId(travelPrompt.healthKitWorkoutId);
    setIsModalOpen(true);
  };

  return (
    <>
      {showTravelBanner && (
        <div
          className="fixed bottom-44 left-4 right-4 z-50 rounded-lg border border-military-green/60 bg-tactical-gray/95 backdrop-blur-sm shadow-2xl p-3 flex items-center gap-3"
          data-testid="banner-travel-prompt"
        >
          <MapPin className="h-5 w-5 text-military-green shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium">Mission logged — post it?</p>
            <p className="text-gray-400 text-xs truncate">{travelSummary}</p>
          </div>
          <Button
            size="sm"
            className="bg-military-green hover:bg-military-green/80 text-white"
            onClick={postTravelWorkout}
            data-testid="button-travel-post"
          >
            Post it
          </Button>
          <button
            onClick={dismissTravelPrompt}
            className="text-gray-400 hover:text-white p-1"
            aria-label="Dismiss"
            data-testid="button-travel-dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Button
        onClick={() => canSubmitActivity && setIsModalOpen(true)}
        disabled={!canSubmitActivity}
        className={`fixed bottom-28 right-6 w-14 h-14 rounded-full shadow-2xl z-50 border-2 border-white/50 transition-all duration-300 ${
          canSubmitActivity 
            ? 'bg-military-green/90 hover:bg-military-green hover:scale-110 hover:shadow-[0_0_20px_rgba(74,222,74,0.6)] backdrop-blur-sm cursor-pointer' 
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

      <ActivitySubmissionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPromptWorkoutId(null);
          // If the workout was posted, the prompt disappears on refetch.
          queryClient.invalidateQueries({ queryKey: ["/api/apple-health/travel-prompt"] });
        }}
        initialWorkoutHkId={promptWorkoutId}
      />
    </>
  );
}
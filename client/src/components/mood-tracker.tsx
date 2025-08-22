import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { MoodAssessmentModal } from "./mood-assessment-modal";

interface MoodTrackerProps {
  children: React.ReactNode;
}

export function MoodTracker({ children }: MoodTrackerProps) {
  const { user } = useAuth();
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [hasCheckedToday, setHasCheckedToday] = useState(false);

  // Check if user should log mood (every 2 days, not on registration day)
  const { data: moodStatus } = useQuery({
    queryKey: ["/api/mood-logs/today", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const response = await fetch(`/api/mood-logs/user/${user.id}/today`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to check mood status");
      return response.json();
    },
    enabled: !!user?.id,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    // Only show mood modal if user is logged in, should log mood (every 2 days, not on registration day), and we haven't checked yet
    if (user && moodStatus && !moodStatus.hasLoggedToday && !hasCheckedToday) {
      // Add a small delay to let the user settle in after login
      const timer = setTimeout(() => {
        setShowMoodModal(true);
        setHasCheckedToday(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [user, moodStatus, hasCheckedToday]);

  const handleCloseMoodModal = () => {
    setShowMoodModal(false);
  };

  return (
    <>
      {children}
      {user && (
        <MoodAssessmentModal
          isOpen={showMoodModal}
          onClose={handleCloseMoodModal}
          userId={user.id}
        />
      )}
    </>
  );
}
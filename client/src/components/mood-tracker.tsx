interface MoodTrackerProps {
  children: React.ReactNode;
}

export function MoodTracker({ children }: MoodTrackerProps) {
  // Mood tracking has been moved to the profile page
  // This component now just passes through children without the popup functionality
  return (
    <>
      {children}
    </>
  );
}
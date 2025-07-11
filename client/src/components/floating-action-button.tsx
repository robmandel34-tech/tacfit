import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";
import ActivitySubmissionModal from "@/components/activity-submission-modal";

export default function FloatingActionButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-military-green/90 hover:bg-military-green-light/90 shadow-2xl z-50 border-2 border-white/50 transition-all duration-300 hover:scale-110 backdrop-blur-sm"
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
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
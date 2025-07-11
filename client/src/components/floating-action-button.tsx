import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import ActivitySubmissionModal from "@/components/activity-submission-modal";

export default function FloatingActionButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-military-green hover:bg-military-green-light shadow-2xl z-50 border-2 border-white transition-all duration-300 hover:scale-110"
        size="icon"
      >
        <Plus className="h-6 w-6 text-white" />
      </Button>

      <ActivitySubmissionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
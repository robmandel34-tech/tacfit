import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Crown, Shield } from "lucide-react";

interface CommitmentGateModalProps {
  isOpen: boolean;
  role: "captain" | "member";
  onAccept: () => void;
  onCancel: () => void;
  isPending?: boolean;
}

const CAPTAIN_POINTS = [
  "Lead by example with your own activity and effort.",
  "Run quick check-ins on teammates who have gone quiet.",
  "Offer words of encouragement, support, and advice.",
  "Set the can-do attitude and humor that keeps the team loose.",
  "Learn about your teammates and share about yourself.",
];

const MEMBER_POINTS = [
  "Show up and do my best, even on the hard days.",
  "Share, collaborate, encourage, and support my teammates.",
  "Remember TacFit is different from any other fitness app.",
  "Understand that quitting on myself also means quitting on my team.",
];

export default function CommitmentGateModal({
  isOpen,
  role,
  onAccept,
  onCancel,
  isPending = false,
}: CommitmentGateModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  const isCaptain = role === "captain";
  const points = isCaptain ? CAPTAIN_POINTS : MEMBER_POINTS;
  const Icon = isCaptain ? Crown : Shield;
  const title = isCaptain ? "Captain's Commitment" : "Teammate's Commitment";
  const intro = isCaptain
    ? "Stepping up as captain means more than leading workouts. Acknowledge what your team is counting on you for:"
    : "Joining a team means more than tracking your own activity. Acknowledge what your team is counting on you for:";
  const acceptText = isCaptain ? "I accept the role" : "I'm committed";

  const handleClose = (open: boolean) => {
    if (!open && !isPending) {
      setAcknowledged(false);
      onCancel();
    }
  };

  const handleAccept = () => {
    if (acknowledged && !isPending) {
      onAccept();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-tactical-gray-light border-tactical-gray">
        <DialogHeader>
          <div className="flex items-center justify-center mb-2">
            <div className="w-12 h-12 bg-military-green rounded-full flex items-center justify-center">
              <Icon className={`w-6 h-6 ${isCaptain ? "text-yellow-400" : "text-white"}`} />
            </div>
          </div>
          <DialogTitle className="text-white text-center text-xl">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-gray-300 text-sm text-center">{intro}</p>

          <ul className="space-y-2">
            {points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-200 text-sm">
                <span className="text-military-green font-bold mt-0.5">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <div className="flex items-start gap-2 pt-2 border-t border-tactical-gray">
            <Checkbox
              id="commitment-ack"
              checked={acknowledged}
              onCheckedChange={(v) => setAcknowledged(v === true)}
              className="mt-0.5"
              data-testid="checkbox-commitment-ack"
            />
            <label
              htmlFor="commitment-ack"
              className="text-white text-sm cursor-pointer select-none"
            >
              I acknowledge and accept this commitment.
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setAcknowledged(false);
                onCancel();
              }}
              disabled={isPending}
              className="flex-1"
              data-testid="button-commitment-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!acknowledged || isPending}
              className="flex-1 bg-military-green hover:bg-military-green-light text-forest-green"
              data-testid="button-commitment-accept"
            >
              {isPending ? "Working..." : acceptText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

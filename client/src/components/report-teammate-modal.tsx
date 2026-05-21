import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertTriangle } from "lucide-react";

interface ReportTeammateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: number;
  reportedUserId: number;
  reportedUsername: string;
}

const REASONS = [
  { value: "no_activity", label: "Has not logged any activity" },
  { value: "low_activity", label: "Very low activity / falling behind" },
  { value: "no_response", label: "Not responding to team chat" },
  { value: "other", label: "Other (explain below)" },
];

export function ReportTeammateModal({ open, onOpenChange, teamId, reportedUserId, reportedUsername }: ReportTeammateModalProps) {
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const reset = () => {
    setReason("");
    setNote("");
  };

  const submit = async () => {
    if (!reason) {
      toast({ title: "Pick a reason", description: "Select why you are reporting this teammate.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/teammate-reports", {
        teamId,
        reportedUserId,
        reason,
        note: note.trim() || undefined,
      });
      toast({ title: "Report submitted", description: "Admin has been notified and will review this report." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/teammate-reports"] });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Could not submit", description: err.message || "Try again later.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md bg-tactical-gray border-tactical-gray-lighter">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Report Inactive Teammate
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Reporting <span className="text-white font-medium">{reportedUsername}</span>. Admin will review and decide whether to remove them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-white">Reason</Label>
            <div className="space-y-2">
              {REASONS.map((r) => (
                <label key={r.value} className="flex items-center gap-2 cursor-pointer text-sm text-gray-200">
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-military-green"
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">Note for admin (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything else admin should know..."
              className="bg-tactical-gray-darker border-tactical-gray-lighter text-white"
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting || !reason} className="bg-military-green hover:bg-military-green/90 text-white">
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trophy, Coins } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CompetitionPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competition: {
    id: number;
    name: string;
    description?: string;
  };
  onPaymentSuccess?: () => void;
}

export default function CompetitionPaymentModal({
  open,
  onOpenChange,
  competition,
  onPaymentSuccess
}: CompetitionPaymentModalProps) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const ENTRY_COST_POINTS = 1000;

  useEffect(() => {
    if (open) refreshUser();
  }, [open, refreshUser]);

  const pointsPaymentMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/competitions/${competition.id}/enter-with-points`, {
      userId: user?.id
    }),
    onSuccess: (data: any) => {
      toast({
        title: "Entry Successful!",
        description: `You've spent ${ENTRY_COST_POINTS} points to enter. Remaining: ${data.remainingPoints} pts`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users/'] });
      queryClient.invalidateQueries({ queryKey: ['/api/competitions'] });
      onOpenChange(false);
      if (onPaymentSuccess) onPaymentSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Entry Failed",
        description: error.message || "Failed to process entry",
        variant: "destructive",
      });
    },
  });

  const userPoints = user?.points || 0;
  const hasEnoughPoints = userPoints >= ENTRY_COST_POINTS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-military-green" />
            Enter Competition
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-heading">{competition.name}</h3>
            {competition.description && (
              <p className="text-sm text-muted-foreground mt-1">{competition.description}</p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-medium text-heading flex items-center gap-2">
              <Coins className="h-4 w-4 text-combat-orange" />
              Entry Cost
            </h4>
            <div className="flex items-center justify-between bg-surface-overlay rounded-lg p-3">
              <span className="text-muted-foreground text-sm">Required points</span>
              <Badge variant="outline">{ENTRY_COST_POINTS} pts</Badge>
            </div>
            <div className="flex items-center justify-between bg-surface-overlay rounded-lg p-3">
              <span className="text-muted-foreground text-sm">Your balance</span>
              <span className={hasEnoughPoints ? "text-military-green font-medium" : "text-destructive font-medium"}>
                {userPoints} pts
              </span>
            </div>
            {!hasEnoughPoints && (
              <p className="text-xs text-destructive">
                Need {ENTRY_COST_POINTS - userPoints} more points to enter.
              </p>
            )}
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => pointsPaymentMutation.mutate()}
              disabled={!hasEnoughPoints || pointsPaymentMutation.isPending}
              className="flex-1 bg-military-green hover:bg-military-green-light text-white disabled:opacity-50"
            >
              {pointsPaymentMutation.isPending ? "Processing…" : "Confirm Entry"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

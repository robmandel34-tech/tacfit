import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trophy, Coins, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getCompetitionPricing } from "@shared/pricing";

const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : null;

interface CompetitionPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competition: {
    id: number;
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    paymentType?: string;
  };
  onPaymentSuccess?: () => void;
}

function CardCheckoutForm({
  competitionId,
  userId,
  onDone,
  onBack,
}: {
  competitionId: number;
  userId: number;
  onDone: () => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      toast({ title: "Payment failed", description: error.message || "Card was declined.", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      try {
        const res = await apiRequest("POST", `/api/competitions/${competitionId}/enter-with-payment`, {
          paymentIntentId: paymentIntent.id,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Entry failed");
        toast({ title: "Entry Successful!", description: "Payment confirmed." });
        queryClient.invalidateQueries({ queryKey: ['/api/competitions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/users/'] });
        onDone();
      } catch (err: any) {
        toast({ title: "Entry failed", description: err.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Payment not completed", description: `Status: ${paymentIntent?.status || 'unknown'}`, variant: "destructive" });
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <PaymentElement />
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onBack} className="flex-1" disabled={submitting}>
          Back
        </Button>
        <Button
          type="submit"
          disabled={!stripe || submitting}
          className="flex-1 bg-military-green hover:bg-military-green-light text-forest-green"
        >
          {submitting ? "Processing…" : "Pay Now"}
        </Button>
      </div>
    </form>
  );
}

export default function CompetitionPaymentModal({
  open,
  onOpenChange,
  competition,
  onPaymentSuccess,
}: CompetitionPaymentModalProps) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<"choose" | "card">("choose");
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Fetch full competition details so pricing can use real start/end dates
  const { data: fullComp } = useQuery<any>({
    queryKey: ['/api/competitions', competition.id],
    enabled: open,
  });

  const pricing = useMemo(
    () => getCompetitionPricing((fullComp as any) || competition),
    [fullComp, competition],
  );

  useEffect(() => {
    if (open) {
      refreshUser();
      setView("choose");
      setClientSecret(null);
    }
  }, [open, refreshUser]);

  const pointsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/competitions/${competition.id}/enter-with-points`, {});
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Entry failed");
      return data;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Entry Successful!",
        description: `Spent ${data.pointsDeducted} pts. Remaining: ${data.remainingPoints} pts`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users/'] });
      queryClient.invalidateQueries({ queryKey: ['/api/competitions'] });
      onOpenChange(false);
      onPaymentSuccess?.();
    },
    onError: (err: any) => {
      toast({ title: "Entry Failed", description: err.message || "Failed to process entry", variant: "destructive" });
    },
  });

  const createIntent = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/create-payment-intent", {
        competitionId: competition.id,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to start payment");
      return data;
    },
    onSuccess: (data: any) => {
      setClientSecret(data.clientSecret);
      setView("card");
    },
    onError: (err: any) => {
      toast({ title: "Payment setup failed", description: err.message, variant: "destructive" });
    },
  });

  const userPoints = user?.points || 0;
  const hasEnoughPoints = pricing ? userPoints >= pricing.points : false;

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
            {pricing && (
              <p className="text-xs text-muted-foreground mt-1">{pricing.weeks}-week competition</p>
            )}
          </div>

          <Separator />

          {!pricing && (
            <div className="text-sm text-muted-foreground">
              Loading entry options…
            </div>
          )}

          {pricing && view === "choose" && (
            <>
              <div className="space-y-2">
                <h4 className="font-medium text-heading text-sm">Choose how to pay</h4>

                <button
                  type="button"
                  onClick={() => createIntent.mutate()}
                  disabled={createIntent.isPending}
                  className="w-full flex items-center justify-between bg-surface-overlay hover:bg-surface-overlay/80 rounded-lg p-4 text-left transition-colors disabled:opacity-50"
                  data-testid="button-pay-card"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-military-green" />
                    <div>
                      <div className="font-medium text-heading">
                        {createIntent.isPending ? "Preparing…" : "Pay with Card"}
                      </div>
                      <div className="text-xs text-muted-foreground">Secure checkout via Stripe</div>
                    </div>
                  </div>
                  <Badge variant="outline">${pricing.dollars.toFixed(2)}</Badge>
                </button>

                <button
                  type="button"
                  onClick={() => hasEnoughPoints && pointsMutation.mutate()}
                  disabled={!hasEnoughPoints || pointsMutation.isPending}
                  className="w-full flex items-center justify-between bg-surface-overlay hover:bg-surface-overlay/80 rounded-lg p-4 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-pay-points"
                >
                  <div className="flex items-center gap-3">
                    <Coins className="h-5 w-5 text-combat-orange" />
                    <div>
                      <div className="font-medium text-heading">
                        {pointsMutation.isPending ? "Processing…" : "Use Points"}
                      </div>
                      <div className={`text-xs ${hasEnoughPoints ? 'text-muted-foreground' : 'text-destructive'}`}>
                        Balance: {userPoints} pts
                        {!hasEnoughPoints && ` (need ${pricing.points - userPoints} more)`}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">{pricing.points} pts</Badge>
                </button>
              </div>

              <Separator />

              <Button variant="secondary" onClick={() => onOpenChange(false)} className="w-full">
                Cancel
              </Button>
            </>
          )}

          {pricing && view === "card" && clientSecret && stripePromise && user && (
            <Elements
              stripe={stripePromise}
              options={{ clientSecret, appearance: { theme: 'night' } }}
            >
              <CardCheckoutForm
                competitionId={competition.id}
                userId={user.id}
                onDone={() => {
                  onOpenChange(false);
                  onPaymentSuccess?.();
                }}
                onBack={() => setView("choose")}
              />
            </Elements>
          )}

          {pricing && view === "card" && !stripePromise && (
            <div className="text-sm text-destructive">
              Card payments are not configured. Please use points or contact support.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

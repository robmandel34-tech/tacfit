import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trophy, Coins, CreditCard, Check, Lock, ArrowLeft } from "lucide-react";
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
    pricingTier?: string;
  };
  onPaymentSuccess?: () => void;
}

function CardCheckoutForm({
  competitionId,
  onDone,
  onBack,
  amountLabel,
}: {
  competitionId: number;
  onDone: () => void;
  onBack: () => void;
  amountLabel: string;
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-border-subtle bg-surface-overlay/60 p-4">
        <PaymentElement />
      </div>
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="h-3 w-3" />
        Secured by Stripe · your card details never touch our servers
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onBack} className="flex-1" disabled={submitting}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button
          type="submit"
          disabled={!stripe || submitting}
          className="flex-1 bg-military-green hover:bg-military-green-light text-forest-green font-semibold"
        >
          {submitting ? "Processing…" : `Pay ${amountLabel}`}
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
  const [hovered, setHovered] = useState<"card" | "points" | null>(null);

  // Fetch full competition details so pricing can use real start/end dates + tier
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
  const pointsShortfall = pricing ? Math.max(0, pricing.points - userPoints) : 0;
  const amountLabel = pricing ? `$${pricing.dollars.toFixed(2)}` : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden bg-tactical-dark border-tactical-gray"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Hero header */}
        <div className="relative bg-gradient-to-br from-military-green/30 via-military-green/10 to-transparent px-6 pt-6 pb-5 border-b border-tactical-gray">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Trophy className="h-5 w-5 text-military-green" />
              Enter Competition
            </DialogTitle>
          </DialogHeader>
          <div className="mt-3">
            <h3 className="text-lg font-bold text-white leading-tight">{competition.name}</h3>
            {pricing && (
              <p className="text-xs text-gray-400 mt-1">
                {pricing.tier === 'short' ? 'Short' : 'Long'} format · {pricing.weeks}-week tier
              </p>
            )}
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {!pricing && (
            <div className="text-sm text-muted-foreground text-center py-4">
              Loading entry options…
            </div>
          )}

          {pricing && view === "choose" && (
            <>
              {/* Price summary banner */}
              <div className="rounded-lg bg-surface-overlay/60 border border-tactical-gray px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Entry Fee</div>
                  <div className="text-2xl font-bold text-white leading-tight">
                    ${pricing.dollars.toFixed(2)}
                    <span className="text-gray-500 text-base font-normal"> / </span>
                    <span className="text-combat-orange text-xl">{pricing.points.toLocaleString()} pts</span>
                  </div>
                </div>
                <div className="hidden sm:flex flex-col items-end text-[11px] text-gray-400">
                  <span>Your balance</span>
                  <span className={`text-sm font-semibold ${hasEnoughPoints ? 'text-white' : 'text-gray-500'}`}>
                    {userPoints.toLocaleString()} pts
                  </span>
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">
                  Choose how to pay
                </div>

                {/* Card option */}
                <button
                  type="button"
                  onClick={() => createIntent.mutate()}
                  onMouseEnter={() => setHovered("card")}
                  onMouseLeave={() => setHovered(null)}
                  disabled={createIntent.isPending}
                  className={`w-full text-left rounded-lg border-2 p-4 mb-3 transition-all disabled:opacity-50 ${
                    hovered === 'card'
                      ? 'border-military-green bg-military-green/10 shadow-lg shadow-military-green/10'
                      : 'border-tactical-gray bg-surface-overlay/40 hover:border-military-green/60'
                  }`}
                  data-testid="button-pay-card"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-md bg-military-green/20 text-military-green flex-shrink-0">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-white">
                          {createIntent.isPending ? "Preparing…" : "Pay with Card"}
                        </span>
                        <span className="text-lg font-bold text-white whitespace-nowrap">
                          ${pricing.dollars.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Secure checkout via Stripe
                      </div>
                    </div>
                  </div>
                </button>

                {/* Points option */}
                <button
                  type="button"
                  onClick={() => hasEnoughPoints && pointsMutation.mutate()}
                  onMouseEnter={() => setHovered("points")}
                  onMouseLeave={() => setHovered(null)}
                  disabled={!hasEnoughPoints || pointsMutation.isPending}
                  className={`w-full text-left rounded-lg border-2 p-4 transition-all disabled:cursor-not-allowed ${
                    !hasEnoughPoints
                      ? 'border-tactical-gray bg-surface-overlay/20 opacity-60'
                      : hovered === 'points'
                        ? 'border-combat-orange bg-combat-orange/10 shadow-lg shadow-combat-orange/10'
                        : 'border-tactical-gray bg-surface-overlay/40 hover:border-combat-orange/60'
                  }`}
                  data-testid="button-pay-points"
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex items-center justify-center h-10 w-10 rounded-md flex-shrink-0 ${
                      hasEnoughPoints
                        ? 'bg-combat-orange/20 text-combat-orange'
                        : 'bg-tactical-gray/30 text-gray-500'
                    }`}>
                      <Coins className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-white">
                          {pointsMutation.isPending ? "Processing…" : "Use Points"}
                        </span>
                        <span className="text-lg font-bold text-white whitespace-nowrap">
                          {pricing.points.toLocaleString()} pts
                        </span>
                      </div>
                      <div className={`text-xs mt-0.5 flex items-center gap-1 ${
                        hasEnoughPoints ? 'text-gray-400' : 'text-destructive'
                      }`}>
                        {hasEnoughPoints ? (
                          <>
                            <Check className="h-3 w-3 text-success" />
                            You have {userPoints.toLocaleString()} pts available
                          </>
                        ) : (
                          <>Need {pointsShortfall.toLocaleString()} more pts to use this option</>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              <Separator className="bg-tactical-gray" />

              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="w-full text-gray-400 hover:text-white hover:bg-tactical-gray/40"
              >
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
                amountLabel={amountLabel}
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

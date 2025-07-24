import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trophy, CreditCard, Coins } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

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
  const [, setLocation] = useLocation();
  const [paymentMethod, setPaymentMethod] = useState<'points' | 'stripe' | null>(null);

  const ENTRY_COST_POINTS = 1000;  // Change this number to adjust point cost
  const ENTRY_COST_USD = 10;       // Change this number to adjust dollar cost

  // Refresh user data when modal opens to get latest points
  useEffect(() => {
    if (open) {
      refreshUser();
    }
  }, [open, refreshUser]);

  const pointsPaymentMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/competitions/${competition.id}/enter-with-points`, {
      userId: user?.id
    }),
    onSuccess: (data) => {
      toast({
        title: "Entry Payment Successful!",
        description: `You've paid ${ENTRY_COST_POINTS} points to enter the competition. Remaining points: ${data.remainingPoints}`,
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/users/'] });
      queryClient.invalidateQueries({ queryKey: ['/api/competitions'] });
      
      onOpenChange(false);
      
      // After successful payment, trigger team selection
      if (onPaymentSuccess) {
        onPaymentSuccess();
      } else {
        // Fallback: navigate to competitions page
        setLocation('/competitions');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process points payment",
        variant: "destructive",
      });
    },
  });

  const handlePointsPayment = async () => {
    // Refresh user data to get latest points balance
    await refreshUser();
    pointsPaymentMutation.mutate();
  };

  const handleStripePayment = () => {
    // Navigate to checkout page with competition context
    setLocation(`/checkout?competitionId=${competition.id}&amount=${ENTRY_COST_USD}`);
  };

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

          <div className="space-y-3">
            <h4 className="font-medium text-heading">Choose Payment Method</h4>
            
            {/* Points Payment Option */}
            <Card 
              className={`cursor-pointer transition-all duration-200 border-2 ${
                paymentMethod === 'points' 
                  ? 'border-military-green bg-military-green/10 shadow-md' 
                  : hasEnoughPoints 
                    ? 'border-border hover:border-military-green/50 hover:bg-surface-elevated' 
                    : 'opacity-50 cursor-not-allowed border-border'
              }`}
              onClick={() => hasEnoughPoints && setPaymentMethod('points')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-combat-orange" />
                    <span>Use Tactical Points</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {ENTRY_COST_POINTS} pts
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Your Balance:</span>
                  <span className={userPoints >= ENTRY_COST_POINTS ? "text-military-green" : "text-destructive"}>
                    {userPoints} pts
                  </span>
                </div>
                {!hasEnoughPoints && (
                  <p className="text-xs text-destructive mt-1">
                    Insufficient points (need {ENTRY_COST_POINTS - userPoints} more)
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Stripe Payment Option */}
            <Card 
              className={`cursor-pointer transition-all duration-200 border-2 ${
                paymentMethod === 'stripe' 
                  ? 'border-military-green bg-military-green/10 shadow-md' 
                  : 'border-border hover:border-military-green/50 hover:bg-surface-elevated'
              }`}
              onClick={() => setPaymentMethod('stripe')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-steel-blue" />
                    <span>Credit/Debit Card</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    ${ENTRY_COST_USD}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">
                  Secure payment via Stripe
                </p>
              </CardContent>
            </Card>
          </div>

          <Separator />

          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={paymentMethod === 'points' ? handlePointsPayment : handleStripePayment}
              disabled={!paymentMethod || (paymentMethod === 'points' && (!hasEnoughPoints || pointsPaymentMutation.isPending))}
              className="flex-1 bg-military-green hover:bg-military-green-light text-white disabled:opacity-50"
            >
              {pointsPaymentMutation.isPending ? "Processing..." : 
               paymentMethod === 'points' ? "Pay with Points" : 
               paymentMethod === 'stripe' ? "Continue to Payment" : 
               "Select Payment Method"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
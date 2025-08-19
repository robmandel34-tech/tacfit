import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trophy, CreditCard, ArrowLeft } from "lucide-react";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ competition, onSuccess }: { competition: any, onSuccess: () => void }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/competitions`,
        },
        redirect: 'if_required'
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Process competition entry
        const response = await apiRequest("POST", `/api/competitions/${competition.id}/enter-with-payment`, {
          userId: user?.id,
          paymentIntentId: paymentIntent.id
        });

        if (response.ok) {
          toast({
            title: "Payment Successful",
            description: "You have successfully joined the competition!",
          });
          onSuccess();
        } else {
          const data = await response.json();
          toast({
            title: "Entry Failed",
            description: data.message || "Failed to process competition entry",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred during payment",
        variant: "destructive",
      });
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || !elements || isProcessing}
        className="w-full bg-military-green hover:bg-military-green-light"
      >
        {isProcessing ? 'Processing...' : `Pay $${(competition.entryFee / 100).toFixed(2)} & Join`}
      </Button>
    </form>
  );
};

export default function Checkout() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [clientSecret, setClientSecret] = useState("");
  const [competition, setCompetition] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const competitionId = params.id ? parseInt(params.id) : null;

  useEffect(() => {
    if (!competitionId || !user) {
      setLoading(false);
      return;
    }

    const initializePayment = async () => {
      try {
        // Get competition details
        const compResponse = await apiRequest("GET", `/api/competitions/${competitionId}`);
        if (!compResponse.ok) {
          toast({
            title: "Error",
            description: "Competition not found",
            variant: "destructive",
          });
          setLocation('/competitions');
          return;
        }

        const competitionData = await compResponse.json();
        setCompetition(competitionData);

        // Check if competition requires payment
        if (competitionData.paymentType !== 'one_time' || !competitionData.entryFee) {
          toast({
            title: "Error",
            description: "This competition does not require payment",
            variant: "destructive",
          });
          setLocation('/competitions');
          return;
        }

        // Create payment intent
        const paymentResponse = await apiRequest("POST", "/api/create-payment-intent", { 
          amount: competitionData.entryFee,
          competitionId: competitionData.id,
          userId: user.id
        });

        if (!paymentResponse.ok) {
          const error = await paymentResponse.json();
          toast({
            title: "Payment Setup Failed",
            description: error.message,
            variant: "destructive",
          });
          setLocation('/competitions');
          return;
        }

        const data = await paymentResponse.json();
        setClientSecret(data.clientSecret);
        
      } catch (error) {
        console.error('Payment initialization error:', error);
        toast({
          title: "Error",
          description: "Failed to initialize payment",
          variant: "destructive",
        });
        setLocation('/competitions');
      } finally {
        setLoading(false);
      }
    };

    initializePayment();
  }, [competitionId, user]);

  const handlePaymentSuccess = () => {
    setLocation('/competitions');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-tactical-dark flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-military-green border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!clientSecret || !competition) {
    return (
      <div className="min-h-screen bg-tactical-dark flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6">
            <p className="text-center text-gray-300">Unable to initialize payment. Redirecting...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tactical-dark">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Button
            variant="ghost"
            onClick={() => setLocation('/competitions')}
            className="mb-6 text-gray-300 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Competitions
          </Button>

          <Card className="bg-tactical-gray-lighter border-tactical-gray">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Trophy className="mr-3 text-military-green" />
                Join Competition
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Competition Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{competition.name}</h3>
                  <p className="text-gray-300 text-sm">{competition.description}</p>
                </div>
                
                <Separator className="bg-tactical-gray" />
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Competition:</span>
                    <span className="text-white">{competition.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Entry Fee:</span>
                    <span className="text-military-green font-semibold">
                      ${(competition.entryFee / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Participant:</span>
                    <span className="text-white">{user?.username}</span>
                  </div>
                </div>
              </div>

              <Separator className="bg-tactical-gray" />

              {/* Payment Form */}
              <div className="space-y-4">
                <div className="flex items-center text-gray-300">
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span className="text-sm font-medium">Payment Details</span>
                </div>
                
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm competition={competition} onSuccess={handlePaymentSuccess} />
                </Elements>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
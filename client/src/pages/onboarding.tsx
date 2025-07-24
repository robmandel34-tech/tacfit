import { useAuthRequired } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import OnboardingWizard from "@/components/onboarding-wizard";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Onboarding() {
  const { user, isLoading } = useAuthRequired();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Complete onboarding mutation
  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("No user ID");
      return apiRequest("PATCH", `/api/users/${user.id}`, {
        onboardingCompleted: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}`] });
      toast({
        title: "Welcome to TacFit!",
        description: "Onboarding complete. Ready for tactical operations!",
      });
      navigate("/");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete onboarding",
        variant: "destructive",
      });
    }
  });

  const handleOnboardingComplete = () => {
    completeOnboardingMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-tactical-gray flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-military-green border-t-transparent rounded-full" />
      </div>
    );
  }

  return <OnboardingWizard onComplete={handleOnboardingComplete} />;
}
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  CheckCircle, 
  Target, 
  Trophy, 
  Users, 
  Camera, 
  Sword,
  Shield,
  Star,
  ArrowRight,
  Upload
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  required: boolean;
  points: number;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "profile_setup",
    title: "Set Your Callsign",
    description: "Choose your tactical username and upload a profile picture",
    icon: Shield,
    required: true,
    points: 50
  },
  {
    id: "bio_motto",
    title: "Mission Brief",
    description: "Add a personal motto to inspire your squad",
    icon: Sword,
    required: false,
    points: 25
  },
  {
    id: "first_competition",
    title: "Join the Fight",
    description: "Enter your first tactical operation",
    icon: Target,
    required: true,
    points: 100
  },
  {
    id: "team_formation",
    title: "Build Your Squad",
    description: "Join or create a team for tactical operations",
    icon: Users,
    required: true,
    points: 75
  },
  {
    id: "first_activity",
    title: "First Mission",
    description: "Log your first fitness activity for tactical points",
    icon: Trophy,
    required: false,
    points: 50
  }
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [username, setUsername] = useState(user?.username || "");
  const [motto, setMotto] = useState("");

  // Calculate progress
  const totalSteps = ONBOARDING_STEPS.length;
  const progress = (completedSteps.length / totalSteps) * 100;
  const totalPoints = completedSteps.reduce((acc, stepId) => {
    const step = ONBOARDING_STEPS.find(s => s.id === stepId);
    return acc + (step?.points || 0);
  }, 0);

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { username?: string; motto?: string }) => {
      if (!user?.id) throw new Error("No user ID");
      return apiRequest("PATCH", `/api/users/${user.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}`] });
      markStepComplete("profile_setup");
      toast({
        title: "Profile Updated! +50 Points",
        description: "Your tactical callsign has been set",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    }
  });

  // Upload profile picture mutation
  const uploadPictureMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error("No user ID");
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await fetch(`/api/users/${user.id}/avatar`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}`] });
      toast({
        title: "Profile Picture Updated!",
        description: "Looking tactical, soldier!",
      });
    }
  });

  const markStepComplete = (stepId: string) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps(prev => [...prev, stepId]);
    }
  };

  const handleStepAction = async (step: OnboardingStep) => {
    switch (step.id) {
      case "profile_setup":
        if (username.trim()) {
          await updateProfileMutation.mutateAsync({ username: username.trim() });
          if (profilePicture) {
            await uploadPictureMutation.mutateAsync(profilePicture);
          }
        }
        break;
      
      case "bio_motto":
        if (motto.trim()) {
          await updateProfileMutation.mutateAsync({ motto: motto.trim() });
          markStepComplete("bio_motto");
          toast({
            title: "Motto Set! +25 Points",
            description: "Your mission brief is locked and loaded",
          });
        }
        break;
      
      case "first_competition":
        // Navigate to competitions page
        markStepComplete("first_competition");
        toast({
          title: "Ready for Operations! +100 Points",
          description: "Time to join your first tactical mission",
        });
        window.location.href = "/competitions";
        break;
      
      case "team_formation":
        // This will be marked complete when user joins a team
        markStepComplete("team_formation");
        toast({
          title: "Squad Formation! +75 Points",
          description: "Ready for tactical operations",
        });
        break;
      
      case "first_activity":
        // This will be marked complete when user logs first activity
        markStepComplete("first_activity");
        toast({
          title: "Mission Complete! +50 Points",
          description: "First tactical points earned",
        });
        break;
    }
  };

  const handleSkipStep = () => {
    const currentStepData = ONBOARDING_STEPS[currentStep];
    if (!currentStepData.required) {
      if (currentStep < totalSteps - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        onComplete();
      }
    }
  };

  const handleNextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // All steps completed
      onComplete();
    }
  };

  const isStepCompleted = (stepId: string) => completedSteps.includes(stepId);
  const currentStepData = ONBOARDING_STEPS[currentStep];

  return (
    <div className="min-h-screen bg-tactical-gray flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-tactical-gray-light border-tactical-gray tile-card-elevated">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-16 h-16 bg-military-green rounded-full flex items-center justify-center">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 bg-combat-orange rounded-full w-6 h-6 flex items-center justify-center">
                <Star className="h-3 w-3 text-white" />
              </div>
            </div>
          </div>
          
          <CardTitle className="text-2xl font-bold text-white mb-2">
            Welcome to TacFit, Soldier!
          </CardTitle>
          
          <div className="space-y-3">
            <Progress value={progress} className="w-full h-3" />
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-300">
                Step {currentStep + 1} of {totalSteps}
              </span>
              <Badge className="bg-combat-orange text-white">
                {totalPoints} Tactical Points Earned
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Current Step */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isStepCompleted(currentStepData.id) 
                  ? "bg-military-green" 
                  : "bg-tactical-gray border-2 border-military-green"
              }`}>
                {isStepCompleted(currentStepData.id) ? (
                  <CheckCircle className="h-6 w-6 text-white" />
                ) : (
                  <currentStepData.icon className="h-6 w-6 text-military-green" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {currentStepData.title}
                </h3>
                <p className="text-gray-300">{currentStepData.description}</p>
                <Badge variant="outline" className="mt-1 text-combat-orange border-combat-orange">
                  +{currentStepData.points} Points
                </Badge>
              </div>
            </div>

            {/* Step-specific content */}
            <div className="bg-tactical-gray rounded-lg p-4 space-y-4">
              {currentStepData.id === "profile_setup" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Tactical Callsign
                    </label>
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your callsign..."
                      className="bg-surface-elevated border-tactical-gray text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Profile Picture (Optional)
                    </label>
                    <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={profilePicture ? URL.createObjectURL(profilePicture) : undefined} />
                        <AvatarFallback className="bg-military-green text-white text-lg">
                          {username.charAt(0).toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setProfilePicture(file);
                          }}
                          className="hidden"
                          id="profile-upload"
                        />
                        <label htmlFor="profile-upload">
                          <Button variant="outline" className="cursor-pointer" asChild>
                            <span>
                              <Camera className="h-4 w-4 mr-2" />
                              Upload Photo
                            </span>
                          </Button>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStepData.id === "bio_motto" && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Personal Motto
                  </label>
                  <Input
                    value={motto}
                    onChange={(e) => setMotto(e.target.value)}
                    placeholder="e.g., 'Adapt, Overcome, Excel'"
                    className="bg-surface-elevated border-tactical-gray text-white"
                    maxLength={100}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {motto.length}/100 characters
                  </p>
                </div>
              )}

              {currentStepData.id === "first_competition" && (
                <div className="text-center space-y-3">
                  <Target className="h-16 w-16 text-military-green mx-auto" />
                  <p className="text-gray-300">
                    Ready to join your first tactical operation? Browse available competitions and start earning points!
                  </p>
                </div>
              )}

              {currentStepData.id === "team_formation" && (
                <div className="text-center space-y-3">
                  <Users className="h-16 w-16 text-military-green mx-auto" />
                  <p className="text-gray-300">
                    Every soldier needs a squad. Join an existing team or create your own tactical unit!
                  </p>
                </div>
              )}

              {currentStepData.id === "first_activity" && (
                <div className="text-center space-y-3">
                  <Trophy className="h-16 w-16 text-military-green mx-auto" />
                  <p className="text-gray-300">
                    Time for your first mission! Log a fitness activity to start earning tactical points for your squad.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {!isStepCompleted(currentStepData.id) && (
              <Button
                onClick={() => handleStepAction(currentStepData)}
                disabled={
                  updateProfileMutation.isPending || 
                  uploadPictureMutation.isPending ||
                  (currentStepData.id === "profile_setup" && !username.trim())
                }
                className="flex-1 bg-military-green hover:bg-military-green-dark"
              >
                {updateProfileMutation.isPending || uploadPictureMutation.isPending ? (
                  "Processing..."
                ) : (
                  <>
                    Complete Step
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}

            {!currentStepData.required && !isStepCompleted(currentStepData.id) && (
              <Button
                variant="outline"
                onClick={handleSkipStep}
                className="border-tactical-gray text-gray-300"
              >
                Skip
              </Button>
            )}

            {isStepCompleted(currentStepData.id) && (
              <Button
                onClick={handleNextStep}
                className="flex-1 bg-military-green hover:bg-military-green-dark"
              >
                {currentStep === totalSteps - 1 ? "Complete Onboarding" : "Next Step"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>

          {/* Progress indicators */}
          <div className="flex justify-center gap-2 pt-4">
            {ONBOARDING_STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-military-green"
                    : isStepCompleted(step.id)
                    ? "bg-combat-orange"
                    : "bg-tactical-gray border border-military-green"
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
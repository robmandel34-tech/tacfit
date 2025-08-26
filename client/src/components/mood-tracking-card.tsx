import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Smile, Meh, Frown, TrendingDown, Check, Coins } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface MoodTrackingCardProps {
  userId: number;
}

const moodOptions = [
  { value: "excellent", label: "Excellent", icon: Activity, color: "bg-green-500", description: "Feeling fantastic!" },
  { value: "good", label: "Good", icon: Smile, color: "bg-emerald-500", description: "Feeling positive" },
  { value: "neutral", label: "Neutral", icon: Meh, color: "bg-yellow-500", description: "Feeling okay" },
  { value: "poor", label: "Poor", icon: Frown, color: "bg-orange-500", description: "Feeling down" },
  { value: "terrible", label: "Terrible", icon: TrendingDown, color: "bg-red-500", description: "Really struggling" }
];

export default function MoodTrackingCard({ userId }: MoodTrackingCardProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  const { refreshUser } = useAuth();

  // Check if user has logged mood today
  const { data: moodStatus } = useQuery({
    queryKey: ["/api/mood-logs/today", userId],
    queryFn: async () => {
      const response = await fetch(`/api/mood-logs/user/${userId}/today`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to check mood status");
      return response.json();
    },
    enabled: !!userId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleMoodSubmit = async () => {
    if (!selectedMood) return;

    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/mood-logs", { mood: selectedMood });
      const data = await response.json();

      // Invalidate mood-related queries and refresh user context for points update
      queryClient.invalidateQueries({ queryKey: ["/api/mood-logs"] });
      await refreshUser();

      toast({
        title: "Mood logged successfully",
        description: `Your daily mood has been recorded. You earned ${data.pointsAwarded || 5} points!`,
        className: "bg-military-green border-military-green text-white"
      });

      setIsModalOpen(false);
      setSelectedMood(null);
    } catch (error: any) {
      console.error("Mood logging error:", error);
      const errorMessage = error.errors 
        ? `Validation error: ${error.errors.map((e: any) => e.message).join(', ')}`
        : error.message || "Failed to log your mood. Please try again.";
      
      toast({
        title: "Error logging mood",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasLoggedToday = moodStatus?.hasLoggedToday;

  return (
    <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-3 mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="h-4 w-4 text-military-green" />
          <span className="text-white text-sm font-medium">Daily Check-In</span>
          {hasLoggedToday && (
            <Badge className="bg-military-green/20 text-military-green text-xs px-2 py-0">
              <Check className="h-3 w-3 mr-1" />
              Done
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-xs text-gray-400">
            <Coins className="h-3 w-3 text-yellow-500" />
            <span>+5</span>
          </div>
          
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button 
                className={hasLoggedToday 
                  ? "bg-gray-700 hover:bg-gray-700 cursor-not-allowed text-xs px-2 py-1 h-7" 
                  : "bg-military-green hover:bg-military-green-light text-xs px-2 py-1 h-7"
                }
                disabled={hasLoggedToday}
                size="sm"
              >
                {hasLoggedToday ? "✓" : "Check In"}
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-sm backdrop-blur-md bg-black/80 border border-white/10 max-h-[80vh] overflow-y-auto">
              <DialogHeader className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 bg-military-green/20 rounded-full flex items-center justify-center">
                  <Activity className="h-6 w-6 text-military-green" />
                </div>
                <DialogTitle className="text-xl font-bold text-white">
                  Daily Wellness Check
                </DialogTitle>
                <p className="text-gray-400 text-sm">
                  How are you feeling today? Your check-in helps track your wellness journey.
                </p>
                <div className="flex items-center justify-center space-x-2 text-sm bg-military-green/10 rounded-lg px-3 py-2">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-500 font-medium">+5 points for daily check-in</span>
                </div>
              </DialogHeader>

              <div className="space-y-3 mt-6">
                {moodOptions.map((mood) => {
                  const IconComponent = mood.icon;
                  return (
                    <button
                      key={mood.value}
                      onClick={() => setSelectedMood(mood.value)}
                      className={`w-full p-4 rounded-lg border transition-all duration-200 text-left ${
                        selectedMood === mood.value
                          ? 'border-military-green bg-military-green/20'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full ${mood.color} flex items-center justify-center`}>
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="text-white font-medium">{mood.label}</div>
                          <div className="text-gray-400 text-sm">{mood.description}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedMood(null);
                  }}
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMoodSubmit}
                  disabled={!selectedMood || isSubmitting}
                  className="flex-1 bg-military-green hover:bg-military-green-light"
                >
                  {isSubmitting ? "Submitting..." : "Submit Check-In"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
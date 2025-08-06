import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Smile, Meh, Frown, TrendingDown, Trophy, Coins } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface MoodAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
}

const moodOptions = [
  { value: "excellent", label: "Excellent", icon: Activity, color: "bg-green-500", description: "Feeling fantastic!" },
  { value: "good", label: "Good", icon: Smile, color: "bg-emerald-500", description: "Feeling positive" },
  { value: "neutral", label: "Neutral", icon: Meh, color: "bg-yellow-500", description: "Feeling okay" },
  { value: "poor", label: "Poor", icon: Frown, color: "bg-orange-500", description: "Feeling down" },
  { value: "terrible", label: "Terrible", icon: TrendingDown, color: "bg-red-500", description: "Really struggling" }
];

export function MoodAssessmentModal({ isOpen, onClose, userId }: MoodAssessmentModalProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { refreshUser } = useAuth();

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

      onClose();
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm sharp-card max-h-[80vh] overflow-y-auto bg-tactical-gray-light border-tactical-gray">
        <DialogHeader className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 bg-military-green/20 rounded-full flex items-center justify-center">
            <Activity className="h-6 w-6 text-military-green" />
          </div>
          <DialogTitle className="text-xl font-bold text-white">
            Daily Check-In
          </DialogTitle>
          <p className="text-gray-400 text-sm">
            How are you feeling today?
          </p>
          
          {/* Points Reward Banner */}
          <div className="bg-military-green/10 border border-military-green/30 rounded-lg p-2 flex items-center justify-center space-x-2">
            <Trophy className="h-4 w-4 text-military-green" />
            <span className="text-military-green font-semibold text-sm">Earn 5 Points</span>
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {moodOptions.map((mood) => {
            const Icon = mood.icon;
            const isSelected = selectedMood === mood.value;
            
            return (
              <button
                key={mood.value}
                onClick={() => setSelectedMood(mood.value)}
                className={`group w-full p-3 rounded-lg border-2 transition-all duration-300 hover:scale-[1.01] hover:shadow-md ${
                  isSelected 
                    ? `${mood.color} text-white border-transparent shadow-lg transform scale-[1.01]` 
                    : "border-tactical-gray bg-tactical-gray-light hover:border-military-green/50 hover:bg-tactical-gray"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isSelected ? "bg-white/20" : "bg-military-green/10 group-hover:bg-military-green/20"
                  }`}>
                    <Icon className={`h-4 w-4 transition-all duration-300 ${
                      isSelected ? "text-white" : "text-military-green group-hover:scale-110"
                    }`} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className={`font-semibold transition-colors duration-300 ${
                      isSelected ? "text-white" : "text-white group-hover:text-military-green"
                    }`}>
                      {mood.label}
                    </div>
                  </div>
                  {isSelected && (
                    <Badge className="bg-white/20 text-white border-white/30 text-xs">
                      <Coins className="h-3 w-3 mr-1" />
                      +5
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex space-x-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 sharp-button border-tactical-gray text-gray-400 hover:text-white hover:border-white/50"
            disabled={isSubmitting}
          >
            Skip for Now
          </Button>
          <Button
            onClick={handleMoodSubmit}
            disabled={!selectedMood || isSubmitting}
            className="flex-1 bg-military-green hover:bg-military-green-light text-white sharp-button font-bold shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Logging...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Trophy className="h-4 w-4" />
                <span>Complete Check (+5 PTS)</span>
              </div>
            )}
          </Button>
        </div>

        <div className="text-center mt-6 space-y-2">
          <p className="text-xs text-gray-500">
            Your mood data is private and helps us understand your wellness patterns.
          </p>
          <p className="text-xs text-military-green font-medium">
            🎯 Complete daily mood checks to build consistent wellness habits
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Smile, Meh, Frown, TrendingDown } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MoodAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
}

const moodOptions = [
  { value: "excellent", label: "Excellent", icon: Heart, color: "bg-green-500", description: "Feeling fantastic!" },
  { value: "good", label: "Good", icon: Smile, color: "bg-emerald-500", description: "Feeling positive" },
  { value: "neutral", label: "Neutral", icon: Meh, color: "bg-yellow-500", description: "Feeling okay" },
  { value: "poor", label: "Poor", icon: Frown, color: "bg-orange-500", description: "Feeling down" },
  { value: "terrible", label: "Terrible", icon: TrendingDown, color: "bg-red-500", description: "Really struggling" }
];

export function MoodAssessmentModal({ isOpen, onClose, userId }: MoodAssessmentModalProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleMoodSubmit = async () => {
    if (!selectedMood) return;

    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/mood-logs", { mood: selectedMood });

      // Invalidate mood-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/mood-logs"] });

      toast({
        title: "Mood logged successfully",
        description: "Your daily mood has been recorded. Thank you for checking in!",
        className: "bg-military-green border-military-green text-white"
      });

      onClose();
    } catch (error: any) {
      console.error("Mood logging error:", error);
      toast({
        title: "Error logging mood",
        description: error.message || "Failed to log your mood. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md sharp-card">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-military-green">
            Daily Mood Check-In
          </DialogTitle>
          <p className="text-center text-gray-600 mt-2">
            How are you feeling today? Your mental wellness is important to your tactical readiness.
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {moodOptions.map((mood) => {
            const Icon = mood.icon;
            const isSelected = selectedMood === mood.value;
            
            return (
              <button
                key={mood.value}
                onClick={() => setSelectedMood(mood.value)}
                className={`w-full p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                  isSelected 
                    ? `${mood.color} text-white border-transparent shadow-lg` 
                    : "border-gray-200 hover:border-military-green bg-white"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`h-6 w-6 ${isSelected ? "text-white" : "text-gray-600"}`} />
                  <div className="flex-1 text-left">
                    <div className={`font-semibold ${isSelected ? "text-white" : "text-gray-900"}`}>
                      {mood.label}
                    </div>
                    <div className={`text-sm ${isSelected ? "text-white/80" : "text-gray-500"}`}>
                      {mood.description}
                    </div>
                  </div>
                  {isSelected && (
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                      Selected
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
            className="flex-1 sharp-button"
            disabled={isSubmitting}
          >
            Skip for Now
          </Button>
          <Button
            onClick={handleMoodSubmit}
            disabled={!selectedMood || isSubmitting}
            className="flex-1 bg-military-green hover:bg-military-green/90 text-white sharp-button"
          >
            {isSubmitting ? "Logging..." : "Log Mood"}
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          Your mood data is private and helps us understand your wellness patterns.
        </p>
      </DialogContent>
    </Dialog>
  );
}
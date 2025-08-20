import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, X, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";


interface ActivitySubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ActivityType {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  measurementUnit: string;
  defaultQuantity: number;
  isActive: boolean;
  requiresTextInput?: boolean;
  textInputDescription?: string;
  textInputMinWords?: number;
  requiresHealthKit?: boolean;
}

interface Competition {
  id: number;
  name: string;
  startDate: string;
  requiredActivities?: string[];
}

interface Team {
  id: number;
  competitionId: number;
}

interface HealthKitWorkout {
  id: number;
  workoutType: string;
  duration: number;
  totalEnergyBurned?: number;
  totalDistance?: string;
  startDate: string;
  endDate: string;
  sourceApp?: string;
  deviceModel?: string;
  isConverted: boolean;
}

export default function ActivitySubmissionModal({ isOpen, onClose }: ActivitySubmissionModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [textInput, setTextInput] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [selectedHealthKitWorkout, setSelectedHealthKitWorkout] = useState<HealthKitWorkout | null>(null);
  const [showHealthKitWorkouts, setShowHealthKitWorkouts] = useState(false);


  // Get user's current team membership
  const { data: userTeamMember } = useQuery<any[]>({
    queryKey: [`/api/team-members/${user?.id}`],
    enabled: !!user,
  });

  // Get current team details to find competition
  const { data: currentTeam } = useQuery<Team>({
    queryKey: [`/api/teams/${userTeamMember?.[0]?.teamId}`],
    enabled: !!userTeamMember?.[0]?.teamId,
  });

  // Get competition details to find required activities
  const { data: competition } = useQuery<Competition>({
    queryKey: [`/api/competitions/${currentTeam?.competitionId}`],
    enabled: !!currentTeam?.competitionId,
  });

  // Fetch activity types from database
  const { data: activityTypes = [] } = useQuery<ActivityType[]>({
    queryKey: ["/api/activity-types"],
    select: (data: ActivityType[]) => data.filter(at => at.isActive).sort((a, b) => a.name.localeCompare(b.name))
  });

  // Fetch user's HealthKit workouts
  const { data: healthKitWorkouts = [] } = useQuery<HealthKitWorkout[]>({
    queryKey: [`/api/apple-healthkit/workouts`],
    enabled: !!user?.id && isOpen,
    select: (data: HealthKitWorkout[]) => {
      // Filter out already converted workouts and sort by most recent
      return data.filter(w => !w.isConverted).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    }
  });

  // Get required activities for current competition or fallback to all active types
  const availableActivityTypes = competition?.requiredActivities || activityTypes.map(at => at.name);
  
  // Get filtered activity types that are available for this competition
  const competitionActivityTypes = activityTypes.filter(at => availableActivityTypes.includes(at.name));

  // Check if competition has started
  const competitionHasStarted = competition ? new Date() >= new Date(competition.startDate) : false;
  const daysUntilStart = competition && !competitionHasStarted 
    ? Math.ceil((new Date(competition.startDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
    : 0;

  // Helper functions for text input validation
  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const selectedActivityType = competitionActivityTypes.find(at => at.name === type);
  const requiresTextInput = selectedActivityType?.requiresTextInput || false;
  const requiresHealthKit = selectedActivityType?.requiresHealthKit || false;
  const textInputDescription = selectedActivityType?.textInputDescription || "";
  const minWords = selectedActivityType?.textInputMinWords || 50;
  const maxWords = 100;
  const currentWordCount = countWords(textInput);
  const isTextInputValid = !requiresTextInput || (currentWordCount >= minWords && currentWordCount <= maxWords);



  const submitActivity = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/activities", {
        method: "POST",
        body: data,
      });

      if (!response.ok) {
        throw new Error("Failed to submit activity");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Activity submitted!",
        description: "Your activity has been recorded successfully.",
      });
      // Invalidate all activity-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString()?.includes("/api/activities") ?? false
      });
      // Invalidate user-specific activity queries for profile page
      queryClient.invalidateQueries({ queryKey: ["/api/activities", "user", user?.id] });
      // Invalidate user and team data to update counts
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/history", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/team-members", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString()?.includes("/api/team-members") ?? false
      });
      // Invalidate competition data
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString()?.includes("/api/competitions") ?? false
      });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      console.error("Activity submission error:", error);
      toast({
        title: "Submission failed",
        description: error.message || "There was an error submitting your activity.",
        variant: "destructive",
      });
    },
  });

  const convertHealthKitWorkout = useMutation({
    mutationFn: async (workoutData: { workoutId: number; activityType: string }) => {
      const response = await fetch("/api/apple-health/convert-workout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workoutData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to convert workout");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "HealthKit workout converted!",
        description: "Your workout has been added to the competition.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0]?.toString()?.includes("/api/activities") ?? false
      });
      queryClient.invalidateQueries({ queryKey: [`/api/apple-health/workouts/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id] });
      onClose();
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to convert workout",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setType("");
    setDescription("");
    setQuantity("");
    setTextInput("");
    setImageFiles([]);
    setVideoFile(null);
    setSelectedHealthKitWorkout(null);
    setShowHealthKitWorkouts(false);
  };

  // Helper function to format workout duration
  const formatWorkoutDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  // Helper function to format workout type for display
  const formatWorkoutType = (workoutType: string): string => {
    return workoutType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
  };

  // Handle HealthKit workout selection and conversion
  const handleHealthKitWorkoutSelect = (workout: HealthKitWorkout) => {
    if (!type) {
      toast({
        title: "Select activity type first",
        description: "Please select an activity type before choosing a HealthKit workout.",
        variant: "destructive",
      });
      return;
    }
    
    convertHealthKitWorkout.mutate({
      workoutId: workout.id,
      activityType: type
    });
  };



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    // Validate required fields
    if (!type || !description || !quantity) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Validate text input if required
    if (!isTextInputValid) {
      toast({
        title: "Text input required",
        description: `Please write at least ${minWords} words in the required text input.`,
        variant: "destructive",
      });
      return;
    }

    if (requiresHealthKit) {
      toast({
        title: "HealthKit Required",
        description: "This activity type requires Apple HealthKit integration. Activities must be synced automatically from your HealthKit data.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("userId", user.id.toString());
    formData.append("type", type);
    formData.append("description", description);
    formData.append("quantity", quantity);
    
    // Add text input if provided
    if (textInput.trim()) {
      formData.append("textInput", textInput.trim());
    }
    
    // Add HealthKit workout information if selected
    if (selectedHealthKitWorkout) {
      formData.append("healthKitWorkoutId", selectedHealthKitWorkout.id.toString());
      formData.append("evidenceType", "apple_health");
      // Enhanced text input with HealthKit data
      const healthKitDetails = `HealthKit Workout Data:\n- Type: ${selectedHealthKitWorkout.workoutType}\n- Duration: ${formatWorkoutDuration(selectedHealthKitWorkout.duration)}\n- Date: ${new Date(selectedHealthKitWorkout.startDate).toLocaleDateString()}${selectedHealthKitWorkout.totalEnergyBurned ? `\n- Calories: ${selectedHealthKitWorkout.totalEnergyBurned}` : ''}${selectedHealthKitWorkout.totalDistance ? `\n- Distance: ${selectedHealthKitWorkout.totalDistance}` : ''}${textInput.trim() ? `\n\nAdditional Notes:\n${textInput.trim()}` : ''}`;
      formData.append("healthKitTextInput", healthKitDetails);
    }
    
    if (videoFile) {
      formData.append("evidence", videoFile);
    }
    
    if (imageFiles.length > 0) {
      imageFiles.forEach((file, index) => {
        formData.append("images", file);
      });
    }

    submitActivity.mutate(formData);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      // Limit to 5 images maximum
      const limitedFiles = selectedFiles.slice(0, 5);
      setImageFiles(limitedFiles);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check if it's a video file
      if (selectedFile.type.startsWith('video/')) {
        // Create video element to check duration
        const video = document.createElement('video');
        video.preload = 'metadata';
        
        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src);
          
          if (video.duration > 15) {
            toast({
              title: "Video too long",
              description: "Videos must be 15 seconds or shorter",
              variant: "destructive",
            });
            // Clear the file input
            e.target.value = '';
            return;
          }
          
          setVideoFile(selectedFile);
        };
        
        video.onerror = () => {
          window.URL.revokeObjectURL(video.src);
          toast({
            title: "Invalid video file",
            description: "Please select a valid video file",
            variant: "destructive",
          });
          e.target.value = '';
        };
        
        video.src = URL.createObjectURL(selectedFile);
      } else {
        setVideoFile(selectedFile);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-tactical-gray-light border-tactical-gray text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Submit Activity</DialogTitle>
        </DialogHeader>
        
        {/* Competition Not Started Warning */}
        {!competitionHasStarted && competition && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <h3 className="font-semibold text-orange-100">Competition Not Started</h3>
            </div>
            <p className="text-sm text-orange-200">
              The competition "{competition.name}" starts on {new Date(competition.startDate).toLocaleDateString()}.
              {daysUntilStart > 0 && ` That's ${daysUntilStart} day${daysUntilStart === 1 ? '' : 's'} from now.`}
            </p>
            <p className="text-xs text-orange-300 mt-2">
              Activity submissions will be available once the competition begins.
            </p>
          </div>
        )}
        
        <div className="max-h-[70vh] overflow-y-auto pr-2">
          <form id="activity-form" onSubmit={handleSubmit} className="space-y-4">
            

            
            <div>
            <Label className="text-gray-300 font-medium mb-2">Activity Type</Label>
            <Select value={type} onValueChange={setType} disabled={!competitionHasStarted}>
              <SelectTrigger className="bg-tactical-gray-lighter border-2 border-tactical-gray text-white focus:border-white focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed">
                <SelectValue placeholder={!competitionHasStarted ? "Competition not started" : "Select activity type"} />
              </SelectTrigger>
              <SelectContent className="bg-tactical-gray-light border-tactical-gray text-white">
                {competitionActivityTypes.map((activityType) => (
                  <SelectItem 
                    key={activityType.name} 
                    value={activityType.name} 
                    className="text-white hover:bg-military-green focus:bg-military-green data-[highlighted]:bg-military-green data-[highlighted]:text-white"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{activityType.displayName}</span>
                      {activityType.requiresHealthKit && (
                        <span className="text-xs text-green-400 bg-green-400/20 px-2 py-1 rounded ml-2">
                          HealthKit Required
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Activity Description */}
            {type && (
              <div className="mt-3 space-y-2">
                <div className="p-3 bg-tactical-gray-lighter rounded-lg border border-tactical-gray">
                  <p className="text-sm text-gray-300">
                    <strong className="text-white">About {competitionActivityTypes.find(at => at.name === type)?.displayName}:</strong>
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {competitionActivityTypes.find(at => at.name === type)?.description || "No description available"}
                  </p>
                </div>
                
                {/* HealthKit Requirement Warning */}
                {requiresHealthKit && (
                  <div className="p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <div className="text-yellow-400 text-sm">⚠️</div>
                      <div>
                        <p className="text-sm text-yellow-400 font-medium">
                          Apple HealthKit Required
                        </p>
                        <p className="text-xs text-yellow-300 mt-1">
                          This activity type can only be submitted through Apple HealthKit automatic sync. 
                          Manual submissions are not allowed. Connect your HealthKit in your profile to track this activity.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* HealthKit Workout Selection Dropdown */}
            {type && competitionHasStarted && (
              <div className="mt-4 space-y-3">
                {healthKitWorkouts.length > 0 ? (
                  <>
                    <Label className="text-gray-300 font-medium">Select from Apple HealthKit Workouts</Label>
                    <Select onValueChange={(value) => {
                      if (value === "manual") {
                        setSelectedHealthKitWorkout(null);
                        setDescription("");
                        setQuantity("");
                      } else {
                        const workout = healthKitWorkouts.find(w => w.id.toString() === value);
                        if (workout) {
                          setSelectedHealthKitWorkout(workout);
                          // Auto-fill form but allow customization
                          setDescription(`${workout.workoutType} workout - ${formatWorkoutDuration(workout.duration)}`);
                          setQuantity(workout.duration?.toString() || "30");
                        }
                      }
                    }}>
                      <SelectTrigger className="bg-tactical-gray-lighter border-2 border-tactical-gray text-white focus:border-white focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                        <SelectValue placeholder="Choose workout or enter manually" />
                      </SelectTrigger>
                      <SelectContent className="bg-tactical-gray-light border-tactical-gray text-white">
                        <SelectItem 
                          value="manual" 
                          className="text-white hover:bg-military-green focus:bg-military-green data-[highlighted]:bg-military-green data-[highlighted]:text-white"
                        >
                          📝 Enter activity manually
                        </SelectItem>
                        {healthKitWorkouts.slice(0, 10).map((workout) => (
                          <SelectItem 
                            key={workout.id} 
                            value={workout.id.toString()}
                            className="text-white hover:bg-military-green focus:bg-military-green data-[highlighted]:bg-military-green data-[highlighted]:text-white"
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex flex-col items-start">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{formatWorkoutType(workout.workoutType)}</span>
                                  <span className="text-xs text-gray-400">{formatWorkoutDuration(workout.duration)}</span>
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                  <span>{new Date(workout.startDate).toLocaleDateString()}</span>
                                  {workout.totalEnergyBurned && <span>• {workout.totalEnergyBurned} cal</span>}
                                  {workout.totalDistance && <span>• {workout.totalDistance}</span>}
                                </div>
                              </div>
                              <span className="text-xs text-green-400 bg-green-400/20 px-2 py-1 rounded ml-2">Auto-fill</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedHealthKitWorkout && (
                      <div className="bg-military-green/10 border border-military-green/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-military-green font-medium">HealthKit Workout Selected</span>
                            <span className="text-xs text-green-400 bg-green-400/20 px-2 py-1 rounded">Auto-filled</span>
                          </div>
                          <span className="text-xs text-military-green">Verified data</span>
                        </div>
                        <div className="text-xs text-gray-300 space-y-1">
                          <div><strong>Type:</strong> {selectedHealthKitWorkout.workoutType}</div>
                          <div><strong>Duration:</strong> {formatWorkoutDuration(selectedHealthKitWorkout.duration)}</div>
                          <div><strong>Date:</strong> {new Date(selectedHealthKitWorkout.startDate).toLocaleDateString()}</div>
                          {selectedHealthKitWorkout.totalEnergyBurned && (
                            <div><strong>Calories:</strong> {selectedHealthKitWorkout.totalEnergyBurned}</div>
                          )}
                          {selectedHealthKitWorkout.totalDistance && (
                            <div><strong>Distance:</strong> {selectedHealthKitWorkout.totalDistance}</div>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          💡 Form auto-filled with HealthKit data. Customize description and add photos/videos below, then submit normally.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <div className="text-blue-400 text-sm">💡</div>
                      <div>
                        <p className="text-sm text-blue-400 font-medium">No HealthKit Workouts Found</p>
                        <p className="text-xs text-blue-300 mt-1">
                          Sync your Apple HealthKit to see your workouts here and earn automatic activity points.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div>
            <Label className="text-gray-300 font-medium mb-2">Description</Label>
            <Textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-tactical-gray-lighter border-2 border-tactical-gray text-white h-24 focus:border-white focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder={!competitionHasStarted ? "Competition not started" : "Describe your activity..."}
              disabled={!competitionHasStarted}
              required
            />
          </div>
          
          <div>
            <Label className="text-gray-300 font-medium mb-2">Quantity</Label>
            {type && (
              <div className="text-sm text-military-green font-medium mb-2">
                Enter amount in {competitionActivityTypes.find(at => at.name === type)?.measurementUnit || 'units'}
              </div>
            )}
            <Input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="bg-tactical-gray-lighter border-2 border-tactical-gray text-white focus:border-white focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder={
                !competitionHasStarted 
                  ? "Competition not started"
                  : type 
                    ? `e.g., ${competitionActivityTypes.find(at => at.name === type)?.defaultQuantity || 30}`
                    : "Select activity type first"
              }
              disabled={!type || !competitionHasStarted}
              required
            />
          </div>

          {/* Text Input Field (conditionally rendered) */}
          {requiresTextInput && (
            <div>
              <Label className="text-gray-300 font-medium mb-2">
                Additional Details Required
                <span className="text-red-400 ml-1">*</span>
              </Label>
              {textInputDescription && (
                <div className="text-sm text-military-green font-medium mb-2">
                  {textInputDescription}
                </div>
              )}
              <Textarea 
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                className={`bg-tactical-gray-lighter border-2 ${
                  isTextInputValid ? 'border-tactical-gray' : 'border-red-500'
                } text-white h-32 focus:border-white focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed`}
                placeholder={!competitionHasStarted ? "Competition not started" : `Write ${minWords}-${maxWords} words...`}
                disabled={!competitionHasStarted}
                required
              />
              <div className="flex justify-between items-center mt-2">
                <div className={`text-sm ${
                  currentWordCount >= minWords && currentWordCount <= maxWords 
                    ? 'text-green-400' 
                    : 'text-gray-400'
                }`}>
                  Word count: {currentWordCount} / {minWords}-{maxWords} words
                </div>
                {currentWordCount > 0 && !isTextInputValid && (
                  <div className="text-xs text-red-400">
                    {currentWordCount < minWords 
                      ? `${minWords - currentWordCount} more words needed`
                      : `${currentWordCount - maxWords} words over limit`
                    }
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Points Display */}
          <div className="p-3 bg-tactical-gray-lighter rounded-lg border border-tactical-gray">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Base Points:</span>
              <span className="text-white font-bold">15 points</span>
            </div>
            {imageFiles.length > 0 && videoFile && (
              <div className="flex items-center justify-between mt-1 text-military-green">
                <span className="text-sm">Bonus (Photos + Video):</span>
                <span className="font-bold">+15 points</span>
              </div>
            )}
            <div className="border-t border-tactical-gray mt-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 font-medium">Total:</span>
                <span className="text-military-green font-bold text-lg">
                  {imageFiles.length > 0 && videoFile ? '30' : '15'} points
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-gray-300 font-medium mb-2">Evidence (Photos + Video)</Label>
              {imageFiles.length > 0 && videoFile && (
                <div className="text-xs text-military-green font-medium bg-military-green/10 px-2 py-1 rounded">
                  Double Points!
                </div>
              )}
            </div>
            
            {(imageFiles.length === 0 || !videoFile) ? (
              <div className="text-xs text-gray-400 mb-2">
                💡 Submit both images and video evidence to earn double points (30 total)
              </div>
            ) : null}
            
            {/* Multiple Images Upload */}
            <div className="border-2 border-dashed border-tactical-gray rounded-lg p-4 text-center hover:border-white/50 transition-colors">
              <div className="mb-2">
                <Camera className="mx-auto h-6 w-6 text-gray-400 mb-1" />
                <p className="text-gray-400 text-sm">Image Evidence (up to 5 images)</p>
              </div>
              {imageFiles.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-green-400">✓ {imageFiles.length} image{imageFiles.length > 1 ? 's' : ''} selected</p>
                  <div className="text-gray-400 text-xs space-y-1">
                    {imageFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-center space-x-2">
                        <span>{file.name}</span>
                        <span>• {Math.round(file.size / 1024)}KB</span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setImageFiles([])}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove All
                  </Button>
                </div>
              ) : (
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                    disabled={!competitionHasStarted}
                  />
                  <Label 
                    htmlFor="image-upload"
                    className={`cursor-pointer ${!competitionHasStarted ? 'opacity-50 cursor-not-allowed text-gray-500' : 'text-military-green hover:text-military-green-light'}`}
                  >
                    {!competitionHasStarted ? "Not Available" : "Choose Images"}
                  </Label>
                </div>
              )}
            </div>

            {/* Video Upload */}
            <div className="border-2 border-dashed border-tactical-gray rounded-lg p-4 text-center hover:border-white/50 transition-colors">
              <div className="mb-2">
                <div className="mx-auto h-6 w-6 text-gray-400 mb-1 flex items-center justify-center">🎥</div>
                <p className="text-gray-400 text-sm">Video Evidence</p>
                <p className="text-xs text-gray-500 mt-1">Recommended: MP4 format for best compatibility</p>
              </div>
              {videoFile ? (
                <div className="space-y-2">
                  <p className="text-green-400">✓ {videoFile.name}</p>
                  <p className="text-gray-400 text-xs">
                    Video • {Math.round(videoFile.size / 1024)}KB
                  </p>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setVideoFile(null)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div>
                  <Input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    className="hidden"
                    id="video-upload"
                    disabled={!competitionHasStarted}
                  />
                  <Label 
                    htmlFor="video-upload"
                    className={`cursor-pointer ${!competitionHasStarted ? 'opacity-50 cursor-not-allowed text-gray-500' : 'text-military-green hover:text-military-green-light'}`}
                  >
                    {!competitionHasStarted ? "Not Available" : "Choose Video"}
                  </Label>
                </div>
              )}
            </div>
          </div>
          </form>
        </div>
        
        <div className="flex space-x-3 pt-4 border-t border-tactical-gray">
          <Button 
            type="button" 
            variant="ghost"
            onClick={onClose}
            className="flex-1 bg-tactical-gray-lighter hover:bg-tactical-gray-lightest text-white"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="activity-form"
            disabled={submitActivity.isPending || !type || !description || !competitionHasStarted || requiresHealthKit}
            className="flex-1 bg-military-green hover:bg-military-green-light text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {requiresHealthKit 
              ? "HealthKit Required - Manual Submission Disabled"
              : submitActivity.isPending 
                ? "Submitting..." 
                : !competitionHasStarted 
                  ? "Competition Not Started" 
                  : "Submit"
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, X } from "lucide-react";
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

  const resetForm = () => {
    setType("");
    setDescription("");
    setQuantity("");
    setTextInput("");
    setImageFiles([]);
    setVideoFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to submit activities.",
        variant: "destructive",
      });
      return;
    }

    if (!competitionHasStarted) {
      toast({
        title: "Competition hasn't started",
        description: `Competition starts in ${daysUntilStart} day${daysUntilStart !== 1 ? 's' : ''}. Please wait until then to submit activities.`,
        variant: "destructive",
      });
      return;
    }

    if (!isTextInputValid && requiresTextInput) {
      toast({
        title: "Text input required",
        description: `Please provide a response with ${minWords}-${maxWords} words.`,
        variant: "destructive",
      });
      return;
    }

    // Require at least one image
    if (imageFiles.length === 0) {
      toast({
        title: "Image required",
        description: "Please add at least one photo to document your activity.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("type", type);
    formData.append("description", description);
    formData.append("quantity", quantity);
    formData.append("teamId", userTeamMember?.[0]?.teamId?.toString() || "");
    formData.append("userId", user.id.toString()); // Add user ID for validation
    
    // Add text input if required
    if (requiresTextInput && textInput.trim()) {
      formData.append("textInput", textInput.trim());
    }

    // Add image files
    imageFiles.forEach((file, index) => {
      formData.append(`images`, file);
    });

    // Add video file
    if (videoFile) {
      formData.append("video", videoFile);
    }

    submitActivity.mutate(formData);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File too large",
          description: `${file.name} is larger than 10MB. Please choose a smaller file.`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });
    
    setImageFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 images
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        toast({
          title: "Video too large",
          description: "Video files must be smaller than 100MB.",
          variant: "destructive",
        });
        return;
      }
      setVideoFile(file);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
    setVideoFile(null);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-tactical-gray-dark border border-tactical-gray text-white">
        <DialogHeader>
          <DialogTitle className="text-white text-xl font-bold">Submit Activity</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!competitionHasStarted ? (
            <div className="p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-400 mb-2">
                ⏰ Competition Not Started
              </div>
              <p className="text-sm text-gray-300">
                The competition starts in {daysUntilStart} day{daysUntilStart !== 1 ? 's' : ''}. 
                Come back then to start logging activities!
              </p>
            </div>
          ) : (
            <>
              {/* Activity Type Selection */}
              <div className="space-y-2">
                <Label className="text-gray-300 font-medium">Activity Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="bg-tactical-gray-lighter border-2 border-tactical-gray text-white focus:border-white focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                    <SelectValue placeholder="Choose an activity type" />
                  </SelectTrigger>
                  <SelectContent className="bg-tactical-gray-light border-tactical-gray text-white z-50" position="popper" sideOffset={5}>
                    {competitionActivityTypes.map((activityType) => (
                      <SelectItem 
                        key={activityType.name} 
                        value={activityType.name}
                        className="text-white hover:bg-military-green focus:bg-military-green data-[highlighted]:bg-military-green data-[highlighted]:text-white cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{activityType.displayName}</span>
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
                  </div>
                )}
              </div>

              {/* Quantity Input */}
              {type && (
                <div className="space-y-2">
                  <Label className="text-gray-300 font-medium">
                    Quantity ({selectedActivityType?.measurementUnit || "minutes"})
                  </Label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder={selectedActivityType?.defaultQuantity?.toString() || "30"}
                    className="bg-tactical-gray-lighter border-2 border-tactical-gray text-white placeholder-gray-400 focus:border-white focus:ring-0 focus:ring-offset-0 focus:outline-none"
                    required
                  />
                </div>
              )}

              {/* Description Input */}
              {type && (
                <div className="space-y-2">
                  <Label className="text-gray-300 font-medium">Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your activity..."
                    className="bg-tactical-gray-lighter border-2 border-tactical-gray text-white placeholder-gray-400 focus:border-white resize-none focus:ring-0 focus:ring-offset-0 focus:outline-none"
                    rows={3}
                    required
                  />
                </div>
              )}

              {/* Text Input for specific activity types */}
              {type && requiresTextInput && (
                <div className="space-y-2">
                  <Label className="text-gray-300 font-medium">
                    Additional Response {minWords && `(${minWords}-${maxWords} words)`}
                  </Label>
                  {textInputDescription && (
                    <p className="text-sm text-gray-400 mb-2">
                      {textInputDescription}
                    </p>
                  )}
                  <Textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Please provide your response here..."
                    className={`bg-tactical-gray-lighter border-2 text-white placeholder-gray-400 resize-none focus:ring-0 focus:ring-offset-0 focus:outline-none ${
                      !isTextInputValid ? 'border-red-500 focus:border-red-500' : 'border-tactical-gray focus:border-white'
                    }`}
                    rows={4}
                  />
                  <div className="flex justify-between text-sm">
                    <span className={currentWordCount < minWords || currentWordCount > maxWords ? 'text-red-400' : 'text-gray-400'}>
                      {currentWordCount} / {minWords}-{maxWords} words
                    </span>
                    {!isTextInputValid && (
                      <span className="text-red-400">
                        {currentWordCount < minWords ? `Need ${minWords - currentWordCount} more words` : `${currentWordCount - maxWords} words over limit`}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Photo Evidence */}
              <div className="space-y-3">
                <Label className="text-gray-300 font-medium">Photo Evidence <span className="text-red-400">(at least 1 image required)</span></Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="file"
                      id="image-upload"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('image-upload')?.click()}
                      className="w-full bg-tactical-gray-lighter border-2 border-tactical-gray text-white hover:bg-tactical-gray hover:text-white flex items-center gap-2 h-20"
                      disabled={imageFiles.length >= 5}
                    >
                      <Camera className="w-5 h-5" />
                      Add Photos ({imageFiles.length}/5)
                    </Button>
                  </div>
                  <div>
                    <input
                      type="file"
                      id="video-upload"
                      accept="video/*"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('video-upload')?.click()}
                      className="w-full bg-tactical-gray-lighter border-2 border-tactical-gray text-white hover:bg-tactical-gray hover:text-white flex items-center gap-2 h-20"
                      disabled={!!videoFile}
                    >
                      <Camera className="w-5 h-5" />
                      {videoFile ? "Video Added" : "Add Video"}
                    </Button>
                  </div>
                </div>

                {/* Image Previews */}
                {imageFiles.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {imageFiles.map((file, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg border border-tactical-gray"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 w-6 h-6 p-0 rounded-full"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Video Preview */}
                {videoFile && (
                  <div className="relative">
                    <video
                      src={URL.createObjectURL(videoFile)}
                      className="w-full h-32 object-cover rounded-lg border border-tactical-gray"
                      controls
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={removeVideo}
                      className="absolute top-2 right-2 w-6 h-6 p-0 rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-military-green hover:bg-military-green-dark text-white font-medium py-3"
            disabled={submitActivity.isPending || !type || !description || !quantity || imageFiles.length === 0 || !competitionHasStarted}
          >
            {submitActivity.isPending
              ? "Submitting..."
              : "Submit Activity"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
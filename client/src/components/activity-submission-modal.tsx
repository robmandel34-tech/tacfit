import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, X, HelpCircle, ChevronDown, ChevronUp, Smartphone, RefreshCw, Activity, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_BASE, apiRequest } from "@/lib/queryClient";
import { useAppleHealth } from "@/hooks/use-apple-health";
import { mapHealthKitTypeToActivityName } from "@shared/healthkit";

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
  endDate: string;
  isCompleted?: boolean;
  requiredActivities?: string[];
  reflectionActivities?: string[];
  requireActivityReflection?: boolean;
}

interface Team {
  id: number;
  competitionId: number;
}

interface AppleHealthWorkout {
  id: number;
  healthKitWorkoutId: string;
  activityType: string;
  startTime: string;
  endTime: string;
  durationSec: number;
  distanceMeters: number;
  energyKcal: number;
  eligible?: boolean;
  ineligibleReason?: string | null;
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
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [selectedWorkoutHkId, setSelectedWorkoutHkId] = useState<string | null>(null);

  // Apple Health (iOS native only)
  const appleHealth = useAppleHealth();

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

  // Check competition time window
  const competitionHasStarted = competition ? new Date() >= new Date(competition.startDate) : false;
  const competitionHasEnded = competition
    ? (competition.isCompleted || new Date() > new Date(competition.endDate))
    : false;
  const daysUntilStart = competition && !competitionHasStarted 
    ? Math.ceil((new Date(competition.startDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
    : 0;

  // When competition has ended switch to individual mode (all activity types)
  // When active, only show competition-required types
  const competitionActivityTypes = useMemo(() => {
    if (competitionHasEnded) {
      // Individual mode — offer all activity types
      return activityTypes;
    }
    if (!competition?.requiredActivities || competition.requiredActivities.length === 0) {
      return activityTypes;
    }
    return activityTypes.filter(at => competition.requiredActivities.includes(at.name));
  }, [activityTypes, competition?.requiredActivities, competitionHasEnded]);

  // Reset selected type whenever mode changes (ended ↔ active)
  useEffect(() => {
    setType("");
  }, [competitionHasEnded]);

  // Clear any selected Apple Health workout when the modal closes so a later
  // manual submission can't accidentally re-link a stale workout.
  useEffect(() => {
    if (!isOpen) setSelectedWorkoutHkId(null);
  }, [isOpen]);

  // Apple Health: all synced workouts, annotated with whether each one can be
  // used for the current competition. Outside an active competition every
  // workout is submittable as an independent activity (personal points).
  const competitionId = currentTeam?.competitionId;
  const showHealthWorkouts = appleHealth.native && appleHealth.connected;
  const { data: loadedWorkouts = [], isFetching: workoutsLoading } = useQuery<AppleHealthWorkout[]>({
    queryKey: ["/api/apple-health/workouts", competitionId ?? "independent"],
    queryFn: async () => {
      const url = competitionId
        ? `/api/apple-health/workouts?competitionId=${competitionId}`
        : `/api/apple-health/workouts`;
      const res = await apiRequest("GET", url);
      return res.json();
    },
    enabled: isOpen && showHealthWorkouts,
  });

  // Effective duration in minutes. Older synced workouts can have durationSec=0,
  // so fall back to the elapsed time between the workout's start and end.
  const workoutMinutes = (w: AppleHealthWorkout): number => {
    let sec = w.durationSec || 0;
    if (sec <= 0 && w.startTime && w.endTime) {
      sec = Math.max(0, Math.round((new Date(w.endTime).getTime() - new Date(w.startTime).getTime()) / 1000));
    }
    return Math.round(sec / 60);
  };

  // Prefill the form from a selected HealthKit workout.
  const applyWorkout = (w: AppleHealthWorkout) => {
    const mappedName = mapHealthKitTypeToActivityName(w.activityType);
    const at = mappedName ? competitionActivityTypes.find(a => a.name === mappedName) : undefined;
    const minutes = workoutMinutes(w);
    if (at) {
      setType(at.name);
      if ((at.measurementUnit || "minutes") === "minutes") {
        setQuantity(String(Math.max(1, minutes)));
      }
    }
    setSelectedWorkoutHkId(w.healthKitWorkoutId);
    const km = w.distanceMeters ? (w.distanceMeters / 1000).toFixed(2) : null;
    const parts = [`${w.activityType}`, `${minutes} min`];
    if (km && Number(km) > 0) parts.push(`${km} km`);
    if (w.energyKcal) parts.push(`${w.energyKcal} cal`);
    setDescription(`Apple Health: ${parts.join(" · ")}`);
  };

  // Helper functions for text input validation
  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const selectedActivityType = competitionActivityTypes.find(at => at.name === type);
  // Require reflection if this specific activity has it enabled in the competition, OR if the activity type globally requires it
  const requiresReflectionForActivity = (competition?.reflectionActivities as string[] | undefined)?.includes(type || '') || false;
  const requiresTextInput = requiresReflectionForActivity || selectedActivityType?.requiresTextInput || false;
  const textInputDescription = selectedActivityType?.textInputDescription || (requiresReflectionForActivity ? "Share your thoughts on this activity" : "");
  const minWords = selectedActivityType?.textInputMinWords || 50;
  const maxWords = 100;
  const currentWordCount = countWords(textInput);
  const isTextInputValid = !requiresTextInput || (currentWordCount >= minWords && currentWordCount <= maxWords);

  // Step 1: upload a video file directly to Google Cloud Storage via a signed URL.
  // This bypasses the Replit deployment proxy (which has a small body-size limit).
  // Returns the /uploads/<file> path the server should use as evidenceUrl.
  const uploadVideoDirect = (file: File): Promise<string> =>
    new Promise(async (resolve, reject) => {
      try {
        // Pull the file extension so the resulting URL keeps a recognizable suffix
        const dot = file.name.lastIndexOf('.');
        const extension = dot >= 0 ? file.name.slice(dot) : '';

        // Ask the server for a signed PUT URL
        const urlRes = await fetch(`${API_BASE}/api/upload-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ extension }),
        });
        if (!urlRes.ok) {
          throw new Error('Could not prepare video upload — please try again.');
        }
        const { uploadUrl, uploadedPath } = await urlRes.json();

        // PUT the file straight to GCS with progress tracking.
        // Always send `video/mp4` (even for iPhone .mov files) — iOS WKWebView
        // refuses to play files labeled `video/quicktime`, but plays the same
        // bytes labeled as `video/mp4` just fine.
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', 'video/mp4');

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            // Reserve the last 10% for the activity submit step
            setUploadProgress(Math.round((e.loaded / e.total) * 90));
          }
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(uploadedPath);
          } else {
            reject(new Error(`Video upload failed (${xhr.status}). Please try again.`));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Network error during video upload — check your connection and try again.')));
        xhr.addEventListener('abort', () => reject(new Error('Video upload was cancelled.')));
        xhr.addEventListener('timeout', () => reject(new Error('Video upload timed out. Try a shorter clip or a stronger connection.')));
        xhr.timeout = 15 * 60 * 1000; // 15 min for very large videos
        xhr.send(file);
      } catch (err: any) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });

  const submitActivity = useMutation({
    mutationFn: (data: FormData) =>
      new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE}/api/activities`);
        xhr.withCredentials = true;

        // Simulate progress since proxied environments don't fire reliable progress events
        let simulated = 90;
        setUploadProgress(90);
        const ticker = setInterval(() => {
          simulated = Math.min(simulated + (Math.random() * 1), 98);
          setUploadProgress(Math.round(simulated));
        }, 1500);

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable && e.total > 1024 * 1024) {
            // Only override simulated progress if there's a non-trivial body size
            clearInterval(ticker);
            setUploadProgress(90 + Math.round((e.loaded / e.total) * 8));
          }
        });

        xhr.addEventListener("load", () => {
          clearInterval(ticker);
          setUploadProgress(100);
          setTimeout(() => setUploadProgress(0), 500);
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); } catch { resolve({}); }
          } else {
            let message = "Failed to submit activity";
            try { message = JSON.parse(xhr.responseText)?.message || message; } catch {}
            reject(new Error(message));
          }
        });

        xhr.addEventListener("error", () => {
          clearInterval(ticker);
          setUploadProgress(0);
          reject(new Error("Network error — check your connection and try again."));
        });

        xhr.addEventListener("abort", () => {
          clearInterval(ticker);
          setUploadProgress(0);
          reject(new Error("Upload was cancelled."));
        });

        xhr.addEventListener("timeout", () => {
          clearInterval(ticker);
          setUploadProgress(0);
          reject(new Error("Upload timed out — please try again."));
        });

        // 10 minute timeout (request body is small now, but be generous)
        xhr.timeout = 10 * 60 * 1000;

        xhr.send(data);
      }),
    onSuccess: async (data: any) => {
      toast({
        title: "Activity submitted!",
        description: "Your activity has been recorded successfully.",
      });
      // Apple Health imports are linked to the new activity server-side during
      // creation; just refresh the workout list so the used one drops off.
      if (selectedWorkoutHkId) {
        queryClient.invalidateQueries({ queryKey: ["/api/apple-health/workouts"] });
      }
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
    setUploadProgress(0);
    setSelectedWorkoutHkId(null);
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

    // Removed competition start check - users can now submit activities anytime

    if (!isTextInputValid && requiresTextInput) {
      toast({
        title: "Text input required",
        description: `Please provide a response with ${minWords}-${maxWords} words.`,
        variant: "destructive",
      });
      return;
    }

    // Require at least one image — unless this is an Apple Health import,
    // where the synced workout data is itself the evidence.
    if (imageFiles.length === 0 && !selectedWorkoutHkId) {
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
    // Only attach teamId for active competition submissions; omit for individual (ended competition)
    if (!competitionHasEnded && userTeamMember?.[0]?.teamId) {
      formData.append("teamId", userTeamMember[0].teamId.toString());
    }
    formData.append("userId", user.id.toString());
    // Apple Health import: send the workout id so the server can verify
    // eligibility, accept it as evidence (no photo needed), and link it.
    if (selectedWorkoutHkId) {
      formData.append("healthKitWorkoutId", selectedWorkoutHkId);
    }
    
    // Add text input if required
    if (requiresTextInput && textInput.trim()) {
      formData.append("textInput", textInput.trim());
    }

    // Add image files
    imageFiles.forEach((file, index) => {
      formData.append(`images`, file);
    });

    // For videos, upload directly to cloud storage first (bypasses proxy size limits),
    // then send the resulting path along with the rest of the form.
    if (videoFile) {
      try {
        setUploadProgress(1);
        const videoPath = await uploadVideoDirect(videoFile);
        formData.append("videoUrl", videoPath);
      } catch (err: any) {
        toast({
          title: "Video upload failed",
          description: err?.message || "Could not upload your video. Please try again.",
          variant: "destructive",
        });
        setUploadProgress(0);
        return;
      }
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
          {/* Competition Closed — Individual Mode */}
          {competitionHasEnded && (
            <div className="p-4 bg-orange-900/80 border border-orange-500/50 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-orange-300 mb-2 font-semibold">
                🏁 Competition Closed
              </div>
              <p className="text-sm text-gray-100">
                This competition has ended. You can still log an individual activity — it won't count toward any competition but you'll earn personal points (15–30 pts).
              </p>
            </div>
          )}
          {/* Pre-competition Independent Activity Notice */}
          {!competitionHasEnded && !competitionHasStarted && (
            <div className="p-4 bg-blue-900/80 border border-blue-500/50 rounded-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 text-blue-300 mb-2">
                ℹ️ Independent Activity
              </div>
              <p className="text-sm text-gray-100">
                This activity will not count toward any competition but you'll still earn individual points (15-30 pts).
              </p>
            </div>
          )}
              {/* Apple Health (iOS native only) */}
              {appleHealth.native && (
                <div className="p-4 bg-tactical-gray-lighter border border-tactical-gray rounded-lg">
                  {!appleHealth.connected ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-white font-semibold">
                        <Smartphone className="w-4 h-4 text-military-green" /> Connect Apple Health
                      </div>
                      <p className="text-sm text-gray-400">
                        Pull your workouts straight from Apple Health so you can submit them with one tap.
                      </p>
                      <Button
                        type="button"
                        onClick={() => appleHealth.connect()}
                        disabled={appleHealth.isConnecting}
                        className="bg-military-green hover:bg-military-green/80 text-forest-green"
                        data-testid="button-connect-apple-health"
                      >
                        {appleHealth.isConnecting ? "Connecting..." : "Connect Apple Health"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white font-semibold">
                          <Smartphone className="w-4 h-4 text-military-green" /> Apple Health
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => appleHealth.refresh()}
                          disabled={appleHealth.isSyncing}
                          className="border-tactical-gray text-gray-200 hover:bg-tactical-gray"
                          data-testid="button-refresh-apple-health"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${appleHealth.isSyncing ? "animate-spin" : ""}`} />
                          Refresh
                        </Button>
                      </div>
                      {workoutsLoading ? (
                        <p className="text-sm text-gray-400">Loading your workouts...</p>
                      ) : loadedWorkouts.length === 0 ? (
                        <p className="text-sm text-gray-400">No Apple Health workouts synced yet. Tap Refresh after recording a workout.</p>
                      ) : (() => {
                        const selectedWorkout = loadedWorkouts.find((w) => w.healthKitWorkoutId === selectedWorkoutHkId);
                        return (
                          <div className="space-y-2">
                            <Select
                              value={selectedWorkoutHkId || ""}
                              onValueChange={(id) => {
                                const w = loadedWorkouts.find((x) => x.healthKitWorkoutId === id);
                                if (w && w.eligible !== false) applyWorkout(w);
                              }}
                            >
                              <SelectTrigger
                                className="bg-tactical-gray-lighter border-2 border-tactical-gray text-white focus:border-white focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                                data-testid="select-apple-health-workout"
                              >
                                <SelectValue placeholder="Choose a synced workout" />
                              </SelectTrigger>
                              <SelectContent className="bg-tactical-gray-light border-tactical-gray text-white z-50 max-h-72" position="popper" sideOffset={5}>
                                {loadedWorkouts.map((w) => {
                                  const minutes = workoutMinutes(w);
                                  const km = w.distanceMeters ? (w.distanceMeters / 1000).toFixed(2) : null;
                                  const eligible = w.eligible !== false;
                                  return (
                                    <SelectItem
                                      key={w.healthKitWorkoutId}
                                      value={w.healthKitWorkoutId}
                                      disabled={!eligible}
                                      className="text-white"
                                      data-testid={`workout-${w.healthKitWorkoutId}`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Activity className={`w-4 h-4 ${eligible ? "text-military-green" : "text-gray-500"}`} />
                                        <span>
                                          {w.activityType} · {new Date(w.startTime).toLocaleDateString()} · {minutes} min{km && Number(km) > 0 ? ` · ${km} km` : ""}{w.energyKcal ? ` · ${w.energyKcal} cal` : ""}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                            {selectedWorkout && selectedWorkout.eligible !== false && (
                              <div className="flex items-center gap-2 text-xs text-military-green">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Selected: {selectedWorkout.activityType} · {workoutMinutes(selectedWorkout)} min
                              </div>
                            )}
                            {selectedWorkout && selectedWorkout.eligible === false && selectedWorkout.ineligibleReason && (
                              <div className="text-xs text-amber-400">Can't use: {selectedWorkout.ineligibleReason}</div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

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
                        className="text-forest-green hover:bg-military-green focus:bg-military-green data-[highlighted]:bg-military-green data-[highlighted]:text-white cursor-pointer"
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
                    Quantity ({selectedActivityType?.measurementUnit || "minutes"}) <span className="text-red-400">*</span>
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
                  <Label className="text-gray-300 font-medium">Description <span className="text-red-400">*</span></Label>
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

              {/* Activity Reflection / Text Input */}
              {type && requiresTextInput && (
                <div className="space-y-2">
                  <Label className="text-gray-300 font-medium">
                    Activity Reflection {minWords && `(${minWords}-${maxWords} words)`}
                  </Label>
                  {textInputDescription && (
                    <p className="text-sm text-gray-400 mb-2">
                      {textInputDescription}
                    </p>
                  )}
                  <Textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Describe your experience — how did it go, how did you feel, what did you notice?"
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
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label className="text-gray-300 font-medium">Photo Evidence {selectedWorkoutHkId ? <span className="text-gray-400">(optional — Apple Health workout is the evidence)</span> : <><span className="text-red-400">*</span> <span className="text-gray-400">(at least 1 image required)</span></>}</Label>
                  <button
                    type="button"
                    onClick={() => setShowGuidelines((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs text-military-green hover:text-military-green-light underline-offset-2 hover:underline"
                    data-testid="button-evidence-guidelines"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    What counts as good evidence?
                    {showGuidelines ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
                {showGuidelines && (
                  <div className="rounded-lg border border-military-green/40 bg-tactical-gray-lighter/40 p-3 text-xs text-gray-300 space-y-2">
                    <p className="text-white font-semibold">Good evidence (any one of these is fine):</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>A selfie of you doing the activity</li>
                      <li>Screenshot from a GPS app (Strava, Garmin, Nike Run, etc.)</li>
                      <li>Screenshot from a wearable (Apple Watch, Fitbit, Whoop, Garmin)</li>
                      <li>A short video clip of you mid-activity</li>
                    </ul>
                    <p className="text-yellow-200">
                      <strong>Tip:</strong> stronger proof = lower chance of being flagged by another team.
                    </p>
                    <p className="text-gray-400">
                      When a flag does happen, the review isn't strict — admins are only looking for clearly fake submissions (AI-generated images, photos pulled from the internet, etc.).
                    </p>
                  </div>
                )}
                <div className="p-3 bg-military-green/20 border border-military-green/30 rounded-lg">
                  <p className="text-sm text-green-300">
                    <strong>Points:</strong> 15 points for submission with at least 1 image, 30 points for submission with image + video
                  </p>
                </div>
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

          {/* Upload progress bar */}
          {submitActivity.isPending && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Uploading — please keep this open...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-military-green h-2 rounded-full transition-all duration-300 text-forest-green"
                  style={{ width: `${uploadProgress || 5}%` }}
                />
              </div>
              {uploadProgress === 100 && (
                <p className="text-xs text-gray-400">Processing on server...</p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-military-green hover:bg-military-green-dark text-forest-green font-medium py-3"
            disabled={submitActivity.isPending || !type || !description || !quantity || (imageFiles.length === 0 && !selectedWorkoutHkId)}
          >
            {submitActivity.isPending
              ? uploadProgress > 0 ? `Uploading ${uploadProgress}%` : "Preparing..."
              : "Submit Activity"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useMemo, useEffect, useRef } from "react";
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
import { API_BASE, apiRequest, buildAuthHeaders } from "@/lib/queryClient";
import { useAppleHealth } from "@/hooks/use-apple-health";
import {
  mapHealthKitTypeToActivityName,
  MIN_PASSIVE_EXERCISE_MINUTES,
  isActivityAllowed,
  isMindfulSessionType,
  isMindfulRelabelAllowed,
  healthKitActivityLabel,
} from "@shared/healthkit";
import { activityPoints } from "@shared/points";
import {
  MAX_VIDEO_UPLOAD_BYTES,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_IMAGES_PER_ACTIVITY,
  videoExtensionFor,
  formatBytes,
  formatDuration,
} from "@shared/uploads";
import { reconcileWorkoutDurationSec } from "@/lib/healthkit";
import { celebrate } from "@/lib/celebrate";
import { Capacitor } from "@capacitor/core";
import { useLocation } from "wouter";
import { ShieldCheck } from "lucide-react";

// On native iOS, Radix's popup dropdown opens inside a scroll-locked WKWebView
// dialog where it collapses to a thin sliver and won't scroll. There we fall
// back to the OS-native <select> picker (a full-screen wheel) which always works.
const isNativeApp = Capacitor.isNativePlatform();

// A direct-to-storage video upload is retried this many times when the
// connection drops (phone switched networks, app briefly backgrounded). Each
// attempt gets a fresh signed URL so an expired one can't poison the retry.
const MAX_VIDEO_UPLOAD_ATTEMPTS = 3;

// Thrown for upload failures that are worth retrying automatically (network
// drop, timeout, storage 5xx) — as opposed to a rejected/expired URL (4xx).
class RetryableUploadError extends Error {}

// Read a picked video's length from its metadata (no full decode). Resolves
// null when the browser can't read it, so callers fall back to size-only copy.
const probeVideoDuration = (file: File): Promise<number | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.muted = true;
    let settled = false;
    const finish = (seconds: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      probe.removeAttribute("src");
      probe.load();
      URL.revokeObjectURL(url);
      resolve(seconds);
    };
    const timer = setTimeout(() => finish(null), 5000);
    probe.onloadedmetadata = () =>
      finish(Number.isFinite(probe.duration) && probe.duration > 0 ? probe.duration : null);
    probe.onerror = () => finish(null);
    probe.src = url;
  });

// Plain-language explanation for a video over the size limit, with a concrete
// target length when we could read the clip's duration.
const describeOversizedVideo = (file: File, durationSec: number | null): string => {
  const size = formatBytes(file.size);
  const limit = formatBytes(MAX_VIDEO_UPLOAD_BYTES);
  if (durationSec) {
    // Seconds that would fit under the limit at this clip's bitrate (5% headroom).
    const fitsSec = Math.floor(durationSec * (MAX_VIDEO_UPLOAD_BYTES / file.size) * 0.95);
    if (fitsSec >= 10) {
      return `This video is ${formatDuration(durationSec)} long and ${size} — the limit is ${limit}. Trim it to about ${formatDuration(fitsSec)} or shorter (in Photos, open the video and tap Edit), then add it again.`;
    }
    return `This video is ${formatDuration(durationSec)} long but ${size} — the limit is ${limit}. It was recorded at a very high quality setting; record at 1080p/30 fps (Settings → Camera → Record Video) or trim it to a few seconds, then add it again.`;
  }
  return `This video is ${size} — the limit is ${limit} (roughly 1–2 minutes at 1080p, less at 4K). Trim it shorter, then add it again.`;
};

interface ActivitySubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  // When set, the Apple Health workout with this id is pre-selected as soon as
  // the synced workout list loads (used by the "post your run" prompt).
  initialWorkoutHkId?: string | null;
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
  supportsVerifiedSessions?: boolean;
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
  verifiedActivities?: string[];
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
  // Original device payload. For Mindful Minutes sessions this carries the
  // app that recorded it (e.g. "Headspace") under `source`.
  raw?: { source?: string | null } | null;
  eligible?: boolean;
  ineligibleReason?: string | null;
}

// A day of passive Apple Health activity (exercise minutes + distance, no
// recorded workout) the user can log as an "Unspecified Activity" and label.
interface PassiveActivity {
  metricDate: string;
  exerciseMinutes: number | null;
  activeEnergyKcal: number | null;
  distanceMeters: number | null;
  // The day's main workout burst (preferred over the whole-day totals above).
  burstStart: string | null;
  burstEnd: string | null;
  burstExerciseMinutes: number | null;
  burstActiveEnergyKcal: number | null;
  burstDistanceMeters: number | null;
  eligible: boolean;
  ineligibleReason: string | null;
}

const metersToMiles = (m: number | null | undefined): number =>
  m && m > 0 ? m / 1609.344 : 0;

export default function ActivitySubmissionModal({ isOpen, onClose, initialWorkoutHkId }: ActivitySubmissionModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [textInput, setTextInput] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDurationSec, setVideoDurationSec] = useState<number | null>(null);
  // Persistent, in-form explanation of why a photo/video was rejected or why
  // an upload failed. Toasts disappear in seconds — this stays until the user
  // changes the evidence, so the reason is never missed.
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  // What the progress bar is currently doing ("Uploading video (62 MB)…").
  const [uploadStatus, setUploadStatus] = useState<string>("");
  // True from the moment Submit is pressed until the activity is saved or the
  // attempt fails. The video is uploaded to storage BEFORE the mutation starts,
  // so isPending alone leaves that (long) phase with no feedback and an active
  // Submit button — which is how users end up starting several uploads at once.
  const [isSubmitting, setIsSubmitting] = useState(false);
  // In-flight video PUT and a cancel flag, so closing the modal mid-upload
  // aborts the transfer instead of silently finishing (and posting) later.
  const activeUploadRef = useRef<XMLHttpRequest | null>(null);
  const uploadCancelledRef = useRef(false);
  // Synchronous re-entry lock for handleSubmit. State-based `isBusy` only
  // updates after a render, so two submit events in the same tick (double-tap,
  // Enter + click) could both pass it and create duplicate activities.
  const submitLockRef = useRef(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showTeamProgressInfo, setShowTeamProgressInfo] = useState(false);
  const [showUserPointsInfo, setShowUserPointsInfo] = useState(false);
  const [selectedWorkoutHkId, setSelectedWorkoutHkId] = useState<string | null>(null);
  const [passiveMetricDate, setPassiveMetricDate] = useState<string | null>(null);

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

  // Only restrict the dropdown to the competition's required activities while the
  // competition is actively running (started and not yet ended). Before it starts
  // OR after it ends, the submission is an independent personal-points activity
  // (see the notices below), so EVERY activity type must be available — otherwise
  // a pre-start competition leaves the user with an empty dropdown.
  // Matching is case-insensitive because requiredActivities (e.g. "cardio") and
  // the activity-type names (e.g. "Cardio") are stored with different casing.
  const competitionActivityTypes = useMemo(() => {
    const competitionActive = competitionHasStarted && !competitionHasEnded;
    const required = competition?.requiredActivities ?? [];
    if (!competitionActive || required.length === 0) {
      // Independent / individual mode — offer all activity types.
      return activityTypes;
    }
    const filtered = activityTypes.filter(at => isActivityAllowed(at.name, required));
    // A HealthKit workout can be eligible through an extra category (e.g.
    // functional strength training counts for cardio-only competitions) and
    // prefill a type that isn't in the filtered list — keep it selectable.
    if (type && !filtered.some(at => at.name === type)) {
      const extra = activityTypes.find(at => at.name === type);
      if (extra) return [...filtered, extra];
    }
    return filtered;
  }, [activityTypes, competition?.requiredActivities, competitionHasStarted, competitionHasEnded, type]);

  const resetForm = () => {
    setType("");
    setDescription("");
    setQuantity("");
    setTextInput("");
    setImageFiles([]);
    setVideoFile(null);
    setVideoDurationSec(null);
    setMediaError(null);
    setUploadProgress(0);
    setUploadStatus("");
    setIsSubmitting(false);
    submitLockRef.current = false;
    setSelectedWorkoutHkId(null);
    setPassiveMetricDate(null);
  };

  // Reset selected type whenever mode changes (ended ↔ active)
  useEffect(() => {
    setType("");
  }, [competitionHasEnded]);

  // Fully reset the form when the modal closes. Clearing only the selected
  // workout left the prefilled "Apple Health: ..." description/type/quantity
  // behind, so reopening and submitting created an activity that was NOT linked
  // to its workout — the workout then stayed in the list and could be submitted
  // again. A full reset guarantees no stale prefill survives without its link.
  useEffect(() => {
    if (!isOpen) resetForm();
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

  // Users who connected Apple Health before Mindful Minutes was added have
  // never been asked for that permission. Ask once, here in context, and then
  // re-sync so their meditation sessions show up in the list below.
  const ensureScopesRef = useRef(appleHealth.ensureLatestScopes);
  const syncSilentlyRef = useRef(appleHealth.syncSilently);
  ensureScopesRef.current = appleHealth.ensureLatestScopes;
  syncSilentlyRef.current = appleHealth.syncSilently;
  useEffect(() => {
    if (!isOpen || !showHealthWorkouts) return;
    void ensureScopesRef.current().then((reauthorized) => {
      if (reauthorized) void syncSilentlyRef.current();
    });
  }, [isOpen, showHealthWorkouts]);

  // Passive activity for the most recent unlogged day (exercise minutes +
  // distance). Surfaced as a one-tap "Unspecified Activity" the user can label.
  const { data: passiveActivity = null, isFetching: passiveLoading } = useQuery<PassiveActivity | null>({
    queryKey: ["/api/apple-health/passive-today", competitionId ?? "independent"],
    queryFn: async () => {
      const url = competitionId
        ? `/api/apple-health/passive-today?competitionId=${competitionId}`
        : `/api/apple-health/passive-today`;
      const res = await apiRequest("GET", url);
      return res.json();
    },
    enabled: isOpen && showHealthWorkouts,
  });

  // Effective duration in minutes. The stored durationSec can be 0 (older
  // syncs) or a tiny bogus value reported by HealthKit, so we reconcile it
  // against the elapsed start→end time using the same rule as the sync path.
  // This makes already-synced workouts self-heal without needing a re-sync.
  const workoutMinutes = (w: AppleHealthWorkout): number => {
    const elapsed = w.startTime && w.endTime
      ? Math.max(0, Math.round((new Date(w.endTime).getTime() - new Date(w.startTime).getTime()) / 1000))
      : 0;
    const sec = reconcileWorkoutDurationSec(w.durationSec || 0, elapsed);
    return Math.round(sec / 60);
  };

  // Display name for a synced entry: the workout type ("Running"), or
  // "Meditation" for a Mindful Minutes session.
  const workoutLabel = (w: AppleHealthWorkout): string => healthKitActivityLabel(w.activityType);
  // Which app recorded a Mindful Minutes session (Headspace, Calm, Mindfulness...).
  const workoutSource = (w: AppleHealthWorkout): string | null =>
    isMindfulSessionType(w.activityType) && w.raw?.source ? String(w.raw.source) : null;

  // Prefill the form from a selected HealthKit workout.
  const applyWorkout = (w: AppleHealthWorkout) => {
    const mappedName = mapHealthKitTypeToActivityName(w.activityType);
    // Look in the full list too: a workout eligible via an extra category
    // (functional strength training in a cardio-only competition) maps to a
    // type outside the competition's filtered dropdown.
    const at = mappedName
      ? competitionActivityTypes.find(a => a.name === mappedName) ??
        activityTypes.find(a => a.name === mappedName)
      : undefined;
    const minutes = workoutMinutes(w);
    if (at) {
      setType(at.name);
      if ((at.measurementUnit || "minutes") === "minutes") {
        setQuantity(String(Math.max(1, minutes)));
      }
    } else if (isMindfulSessionType(w.activityType)) {
      // No meditation/prayer type available: clear any previously chosen
      // (non-mindfulness) type so the user picks from the narrowed list.
      setType("");
      setQuantity(String(Math.max(1, minutes)));
    }
    setSelectedWorkoutHkId(w.healthKitWorkoutId);
    setPassiveMetricDate(null);
    const km = w.distanceMeters ? (w.distanceMeters / 1000).toFixed(2) : null;
    const parts = [workoutLabel(w), `${minutes} min`];
    if (km && Number(km) > 0) parts.push(`${km} km`);
    if (w.energyKcal) parts.push(`${w.energyKcal} cal`);
    const source = workoutSource(w);
    if (source) parts.push(source);
    setDescription(`Apple Health: ${parts.join(" · ")}`);
  };

  // Pre-select the workout the "post your run" prompt was tapped for, once the
  // synced list arrives. Applied at most once per modal open so the user can
  // still change or clear the selection afterwards.
  const appliedInitialWorkoutRef = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      appliedInitialWorkoutRef.current = false;
      return;
    }
    if (appliedInitialWorkoutRef.current || !initialWorkoutHkId || loadedWorkouts.length === 0) return;
    const w = loadedWorkouts.find((x) => x.healthKitWorkoutId === initialWorkoutHkId);
    if (w && (w as any).eligible !== false) {
      applyWorkout(w);
      appliedInitialWorkoutRef.current = true;
    }
  }, [isOpen, initialWorkoutHkId, loadedWorkouts]);

  // Figures for the passive day. We prefer the detected workout "burst" (the
  // continuous period the user actually exercised) over the whole-day totals,
  // falling back to whole-day numbers when no burst was detected.
  const passiveMinutes = (p: PassiveActivity): number =>
    Math.max(0, Math.round(p.burstExerciseMinutes ?? p.exerciseMinutes ?? 0));
  const passiveMiles = (p: PassiveActivity): number =>
    Number(metersToMiles(p.burstDistanceMeters ?? p.distanceMeters).toFixed(2));
  const passiveCalories = (p: PassiveActivity): number =>
    Math.max(0, Math.round(p.burstActiveEnergyKcal ?? p.activeEnergyKcal ?? 0));
  // "7:10 – 7:52 AM" for the burst window, or null when there's no burst.
  const passiveTimeRange = (p: PassiveActivity): string | null => {
    if (!p.burstStart || !p.burstEnd) return null;
    const fmt = (iso: string) =>
      new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `${fmt(p.burstStart)} – ${fmt(p.burstEnd)}`;
  };

  // Prefill the form from the day's passive activity. The type is left blank —
  // it's "unspecified" until the user labels it from the dropdown below.
  const applyPassive = (p: PassiveActivity) => {
    const minutes = passiveMinutes(p);
    const miles = passiveMiles(p);
    const cals = passiveCalories(p);
    setType("");
    setQuantity(String(Math.max(1, minutes)));
    setSelectedWorkoutHkId(null);
    setPassiveMetricDate(p.metricDate);
    const parts = [`Unspecified`, `${minutes} min`];
    if (cals > 0) parts.push(`${cals} cal`);
    if (miles > 0) parts.push(`${miles.toFixed(2)} mi`);
    setDescription(`Apple Health: ${parts.join(" · ")}`);
  };

  // Whether a UTC workout timestamp falls on the same *device-local* calendar
  // day as a metric's day key. Apple's exercise minutes already include time
  // spent in recorded workouts, so if a day has a recorded workout we hide the
  // passive item to avoid double-counting. This must be compared in local time
  // (where the metric day was computed) — the server can't match reliably
  // without knowing the device timezone, so we gate it here on the client.
  const sameLocalDay = (iso: string, dayKey: string): boolean => {
    const d = new Date(iso);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return k === dayKey;
  };
  // Mindful Minutes sessions don't count here: meditation doesn't add exercise
  // minutes, so a day with a meditation AND a passive burst is still two
  // distinct things the user can log.
  const passiveDayHasWorkout =
    !!passiveActivity &&
    loadedWorkouts.some(
      (w) => !isMindfulSessionType(w.activityType) && sameLocalDay(w.startTime, passiveActivity.metricDate),
    );
  const showPassive =
    !!passiveActivity &&
    passiveMinutes(passiveActivity) >= MIN_PASSIVE_EXERCISE_MINUTES &&
    !passiveDayHasWorkout;

  // Helper functions for text input validation
  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // While an Apple Health meditation session is attached, the session is the
  // evidence, so the type can only be relabeled within the mindfulness family
  // (the server enforces the same rule).
  const selectedWorkoutIsMindful =
    !!selectedWorkoutHkId &&
    loadedWorkouts.some((w) => w.healthKitWorkoutId === selectedWorkoutHkId && isMindfulSessionType(w.activityType));
  const selectableActivityTypes = selectedWorkoutIsMindful
    ? competitionActivityTypes.filter((at) => isMindfulRelabelAllowed(at.name))
    : competitionActivityTypes;

  const selectedActivityType = competitionActivityTypes.find(at => at.name === type);
  // Require reflection if this specific activity has it enabled in the competition, OR if the activity type globally requires it
  const requiresReflectionForActivity = (competition?.reflectionActivities as string[] | undefined)?.includes(type || '') || false;
  const requiresTextInput = requiresReflectionForActivity || selectedActivityType?.requiresTextInput || false;
  const textInputDescription = selectedActivityType?.textInputDescription || (requiresReflectionForActivity ? "Share your thoughts on this activity" : "");
  const minWords = selectedActivityType?.textInputMinWords || 50;
  const maxWords = 100;
  const currentWordCount = countWords(textInput);
  const isTextInputValid = !requiresTextInput || (currentWordCount >= minWords && currentWordCount <= maxWords);

  // Verified focus sessions: while the competition is running, types listed in
  // its verifiedActivities can ONLY be completed via a camera-verified session
  // (the server enforces this too). Types that merely support verification get
  // an optional shortcut instead.
  const competitionActiveNow = competitionHasStarted && !competitionHasEnded;
  const requiresVerifiedSession =
    competitionActiveNow && !!type && (competition?.verifiedActivities ?? []).includes(type);
  const supportsVerifiedSession = selectedActivityType?.supportsVerifiedSessions || false;
  const goToVerifiedSession = () => {
    onClose();
    navigate(`/verified-session?type=${encodeURIComponent(type)}`);
  };

  // Ask the server for a signed PUT URL for one video upload attempt.
  const requestVideoUploadUrl = async (extension: string): Promise<{ uploadUrl: string; uploadedPath: string }> => {
    const urlRes = await fetch(`${API_BASE}/api/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ extension }),
    });
    if (!urlRes.ok) {
      let serverMessage = '';
      try { serverMessage = (await urlRes.json())?.message || ''; } catch {}
      if (urlRes.status === 401) {
        throw new Error("You've been signed out. Sign in again, then submit your activity.");
      }
      // 400 (unsupported type) / 429 (too many attempts) carry a specific reason.
      throw new Error(serverMessage || 'Could not prepare the video upload — please try again.');
    }
    return urlRes.json();
  };

  // One PUT of the file straight to cloud storage, with progress reporting.
  // Always send `video/mp4` (even for iPhone .mov files) — iOS WKWebView
  // refuses to play files labeled `video/quicktime`, but plays the same bytes
  // labeled as `video/mp4` just fine.
  const putVideoOnce = (file: File, uploadUrl: string): Promise<void> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      activeUploadRef.current = xhr;
      const settle = (fn: () => void) => {
        if (activeUploadRef.current === xhr) activeUploadRef.current = null;
        fn();
      };
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', 'video/mp4');
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          // Reserve the last 10% for the activity submit step
          setUploadProgress(Math.max(1, Math.round((e.loaded / e.total) * 90)));
        }
      });
      xhr.addEventListener('load', () => settle(() => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else if (xhr.status >= 500) {
          reject(new RetryableUploadError(`The storage server had a problem (HTTP ${xhr.status}).`));
        } else {
          reject(new Error(`The storage server rejected the video (HTTP ${xhr.status}). Please remove the video, add it again and resubmit.`));
        }
      }));
      xhr.addEventListener('error', () => settle(() => reject(new RetryableUploadError('The connection dropped during the upload.'))));
      xhr.addEventListener('timeout', () => settle(() => reject(new RetryableUploadError('The upload timed out.'))));
      xhr.addEventListener('abort', () => settle(() => reject(new Error('The video upload was cancelled.'))));
      xhr.timeout = 15 * 60 * 1000; // 15 min per attempt for large videos on slow links
      xhr.send(file);
    });

  // Step 1: upload a video file directly to Google Cloud Storage via a signed URL.
  // This bypasses the Replit deployment proxy (which has a small body-size limit).
  // Retries transient failures automatically (fresh URL each time) and returns
  // the /uploads/<file> path the server should use as evidenceUrl.
  const uploadVideoDirect = async (file: File): Promise<string> => {
    // Keep a recognizable suffix on the stored object; fall back to the MIME
    // type when the picker handed us a nameless blob.
    const extension = videoExtensionFor(file) ?? '.mp4';
    const sizeLabel = formatBytes(file.size);
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_VIDEO_UPLOAD_ATTEMPTS; attempt++) {
      if (uploadCancelledRef.current) throw new Error('The video upload was cancelled.');
      setUploadStatus(
        attempt === 1
          ? `Uploading video (${sizeLabel})…`
          : `Connection dropped — retrying upload (${attempt} of ${MAX_VIDEO_UPLOAD_ATTEMPTS})…`,
      );
      setUploadProgress(1);
      const { uploadUrl, uploadedPath } = await requestVideoUploadUrl(extension);
      try {
        await putVideoOnce(file, uploadUrl);
        return uploadedPath;
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (!(err instanceof RetryableUploadError) || uploadCancelledRef.current) throw lastError;
        // Brief back-off before the next attempt so a flapping link can settle.
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
    throw new Error(
      `${lastError?.message ?? 'The upload failed.'} We tried ${MAX_VIDEO_UPLOAD_ATTEMPTS} times. ` +
        'Keep the app open on this screen while the video uploads, check your signal (Wi‑Fi is best), then press Submit again.',
    );
  };

  const submitActivity = useMutation({
    mutationFn: async (data: FormData) => {
      // Native builds authenticate with a bearer token (cookies aren't
      // reliable in the WKWebView), so attach it here like apiRequest does.
      const authHeaders = await buildAuthHeaders();
      return new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE}/api/activities`);
        xhr.withCredentials = true;
        for (const [name, value] of Object.entries(authHeaders)) {
          xhr.setRequestHeader(name, value);
        }

        // Simulate progress since proxied environments don't fire reliable progress events
        let simulated = 90;
        setUploadStatus(imageFiles.length > 0 ? "Uploading photos and saving your activity…" : "Saving your activity…");
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
      });
    },
    onSuccess: async (data: any) => {
      // Fire the celebration moment: explosion, "Way to Muster up!", sound, buzz.
      celebrate();
      toast({
        title: "Activity submitted!",
        description: "Your activity has been recorded successfully.",
      });
      // Apple Health imports are linked to the new activity server-side during
      // creation; just refresh the workout list so the used one drops off.
      if (selectedWorkoutHkId) {
        queryClient.invalidateQueries({ queryKey: ["/api/apple-health/workouts"] });
      }
      if (passiveMetricDate) {
        queryClient.invalidateQueries({ queryKey: ["/api/apple-health/passive-today"] });
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
      const message = error.message || "There was an error submitting your activity.";
      // Keep the reason visible in the form, not just in a vanishing toast.
      setMediaError(message);
      toast({
        title: "Submission failed",
        description: message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      submitLockRef.current = false;
      setIsSubmitting(false);
      setUploadStatus("");
    },
  });

  // Everything Submit is waiting on, in the user's words. Shown under the
  // button so a greyed-out Submit is never a mystery.
  const hasEvidence =
    imageFiles.length > 0 || !!videoFile || !!selectedWorkoutHkId || !!passiveMetricDate;
  const missingForSubmit = [
    !type && "choose an activity",
    !quantity && "enter the amount",
    !description && "add a description",
    !hasEvidence && "add a photo or video",
  ].filter((item): item is string => Boolean(item));
  const isBusy = isSubmitting || submitActivity.isPending;

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

    // Mandated verified-session types can't be submitted through this form.
    if (requiresVerifiedSession) {
      goToVerifiedSession();
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

    // Require a photo or a video — unless this is an Apple Health import,
    // where the synced workout data is itself the evidence.
    if (!hasEvidence) {
      toast({
        title: "Evidence required",
        description: "Please add at least one photo or a video of your activity.",
        variant: "destructive",
      });
      return;
    }

    // A second tap while the video is still uploading must not start another
    // upload (and another activity) — the button is disabled, but guard anyway.
    if (isBusy || submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);
    setMediaError(null);
    uploadCancelledRef.current = false;

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
    // Passive Apple Health day logged as an Unspecified Activity (user-labeled):
    // send the day so the server can verify, accept it as evidence, and claim it.
    if (passiveMetricDate) {
      formData.append("appleHealthMetricDate", passiveMetricDate);
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
        submitLockRef.current = false;
        // Closed the modal mid-upload: the form is already reset, say nothing.
        if (uploadCancelledRef.current) return;
        const message = err?.message || "Could not upload your video. Please try again.";
        // The video stays attached so one more tap on Submit retries it.
        setMediaError(message);
        toast({
          title: "Video upload failed",
          description: message,
          variant: "destructive",
        });
        setUploadProgress(0);
        setUploadStatus("");
        setIsSubmitting(false);
        return;
      }
    }

    if (uploadCancelledRef.current) {
      submitLockRef.current = false;
      return;
    }
    submitActivity.mutate(formData);
  };

  // Closing the modal while a video is still transferring cancels the upload
  // (nothing is posted); closing during the final save lets the save finish.
  const handleDialogClose = () => {
    if (isSubmitting && !submitActivity.isPending) {
      uploadCancelledRef.current = true;
      activeUploadRef.current?.abort();
    }
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // Let the same file be picked again after a rejection or removal.
    e.target.value = "";
    const rejected: string[] = [];
    const validFiles = files.filter(file => {
      if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
        rejected.push(`${file.name} is ${formatBytes(file.size)}`);
        return false;
      }
      return true;
    });
    if (rejected.length > 0) {
      const message = `${rejected.join(", ")} — photos must be under ${formatBytes(MAX_IMAGE_UPLOAD_BYTES)} each. A screenshot or a regular (non-RAW) photo will work.`;
      setMediaError(message);
      toast({ title: "Photo too large", description: message, variant: "destructive" });
    } else if (validFiles.length > 0) {
      setMediaError(null);
    }

    setImageFiles(prev => [...prev, ...validFiles].slice(0, MAX_IMAGES_PER_ACTIVITY));
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Let the same file be picked again after a rejection or removal.
    e.target.value = "";
    if (!file) return;

    if (!videoExtensionFor(file)) {
      const message = `"${file.name}" isn't a video format we can play. Please use an MP4 or MOV file — videos recorded with your phone's camera work.`;
      setMediaError(message);
      toast({ title: "Unsupported video format", description: message, variant: "destructive" });
      return;
    }

    // Read the clip length up front: it drives the "trim to X" advice when the
    // file is too big, and the size/length caption under the preview otherwise.
    const durationSec = await probeVideoDuration(file);

    if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
      const message = describeOversizedVideo(file, durationSec);
      setMediaError(message);
      toast({ title: "Video too large", description: message, variant: "destructive" });
      return;
    }

    setMediaError(null);
    setVideoDurationSec(durationSec);
    setVideoFile(file);
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoDurationSec(null);
    setMediaError(null);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); }}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto bg-tactical-gray-dark border border-tactical-gray text-white"
        style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", touchAction: "pan-y" }}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
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
                This competition has ended. You can still log an individual activity — it won't count toward any competition but you'll earn personal points based on your effort.
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
                This activity will not count toward any competition but you'll still earn individual points based on your effort.
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
                        Pull your workouts and meditation sessions (Mindful Minutes) straight from Apple Health so you can submit them with one tap.
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
                      {/* Passive activity — log a day's exercise as an Unspecified Activity the user then labels */}
                      {showPassive && passiveActivity && (() => {
                        const minutes = passiveMinutes(passiveActivity);
                        const miles = passiveMiles(passiveActivity);
                        const cals = passiveCalories(passiveActivity);
                        const range = passiveTimeRange(passiveActivity);
                        const eligible = passiveActivity.eligible !== false;
                        const selected = passiveMetricDate === passiveActivity.metricDate;
                        return (
                          <button
                            type="button"
                            disabled={!eligible}
                            onClick={() => eligible && applyPassive(passiveActivity)}
                            data-testid="button-passive-activity"
                            className={`w-full text-left rounded-lg border p-3 transition-colors ${
                              selected
                                ? "border-military-green bg-military-green/10"
                                : "border-tactical-gray bg-tactical-gray-lighter hover:bg-tactical-gray"
                            } ${!eligible ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            <div className="flex items-start gap-2">
                              <Activity className={`w-4 h-4 mt-0.5 ${eligible ? "text-military-green" : "text-gray-500"}`} />
                              <div className="flex-1">
                                <div className="text-white text-sm font-medium">
                                  Unspecified Activity
                                  {selected && <CheckCircle className="inline w-3.5 h-3.5 text-green-400 ml-1" />}
                                </div>
                                <div className="text-xs text-gray-300">
                                  {new Date(`${passiveActivity.metricDate}T12:00:00`).toLocaleDateString()} · {minutes} min{cals > 0 ? ` · ${cals} cal` : ""}{miles > 0 ? ` · ${miles.toFixed(2)} mi` : ""}
                                </div>
                                {range && (
                                  <div className="text-xs text-gray-400 mt-0.5">Workout window: {range}</div>
                                )}
                                {!eligible && passiveActivity.ineligibleReason ? (
                                  <div className="text-xs text-amber-400 mt-0.5">Can't use: {passiveActivity.ineligibleReason}</div>
                                ) : (
                                  <div className="text-xs text-gray-400 mt-0.5">Tap to log it, then choose what it was below.</div>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })()}
                      {workoutsLoading ? (
                        <p className="text-sm text-gray-400">Loading your workouts...</p>
                      ) : loadedWorkouts.length === 0 ? (
                        showPassive ? null : (
                          <p className="text-sm text-gray-400">No Apple Health workouts or meditation sessions synced yet. Tap Refresh after recording one.</p>
                        )
                      ) : (() => {
                        const selectedWorkout = loadedWorkouts.find((w) => w.healthKitWorkoutId === selectedWorkoutHkId);
                        return (
                          <div className="space-y-2">
                            <div className="relative">
                              <select
                                value={selectedWorkoutHkId || ""}
                                onChange={(e) => {
                                  const w = loadedWorkouts.find((x) => x.healthKitWorkoutId === e.target.value);
                                  if (w && w.eligible !== false) applyWorkout(w);
                                }}
                                data-testid="select-apple-health-workout"
                                className="w-full h-10 appearance-none rounded-md bg-tactical-gray-lighter border-2 border-tactical-gray text-white pl-3 pr-9 text-sm focus:border-white focus:outline-none"
                              >
                                <option value="" disabled>Choose a synced workout or meditation</option>
                                {loadedWorkouts.map((w) => {
                                  const minutes = workoutMinutes(w);
                                  const km = w.distanceMeters ? (w.distanceMeters / 1000).toFixed(2) : null;
                                  const eligible = w.eligible !== false;
                                  const source = workoutSource(w);
                                  const label = `${workoutLabel(w)} · ${new Date(w.startTime).toLocaleDateString()} · ${minutes} min${km && Number(km) > 0 ? ` · ${km} km` : ""}${w.energyKcal ? ` · ${w.energyKcal} cal` : ""}${source ? ` · ${source}` : ""}${!eligible && w.ineligibleReason ? ` (can't use: ${w.ineligibleReason})` : ""}`;
                                  return (
                                    <option
                                      key={w.healthKitWorkoutId}
                                      value={w.healthKitWorkoutId}
                                      disabled={!eligible}
                                      data-testid={`workout-${w.healthKitWorkoutId}`}
                                    >
                                      {label}
                                    </option>
                                  );
                                })}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
                            </div>
                            {selectedWorkout && selectedWorkout.eligible !== false && (
                              <div className="flex items-center gap-2 text-xs text-military-green">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Selected: {workoutLabel(selectedWorkout)} · {workoutMinutes(selectedWorkout)} min
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
                {isNativeApp ? (
                  <div className="relative">
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      data-testid="select-activity-type"
                      className="w-full h-10 appearance-none rounded-md bg-tactical-gray-lighter border-2 border-tactical-gray text-white pl-3 pr-9 text-sm focus:border-white focus:outline-none"
                    >
                      <option value="" disabled>Choose an activity type</option>
                      {selectableActivityTypes.map((activityType) => (
                        <option key={activityType.name} value={activityType.name}>
                          {activityType.displayName}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
                  </div>
                ) : (
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="bg-tactical-gray-lighter border-2 border-tactical-gray text-white focus:border-white focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
                      <SelectValue placeholder="Choose an activity type" />
                    </SelectTrigger>
                    <SelectContent className="bg-tactical-gray-light border-tactical-gray text-white z-50" position="popper" sideOffset={5}>
                      {selectableActivityTypes.map((activityType) => (
                        <SelectItem 
                          key={activityType.name} 
                          value={activityType.name}
                          className="text-white hover:bg-military-green focus:bg-military-green data-[highlighted]:bg-military-green data-[highlighted]:text-forest-green cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{activityType.displayName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
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

                {/* This competition mandates camera verification for this type */}
                {type && requiresVerifiedSession && (
                  <div className="mt-3 p-4 bg-military-green/15 border border-military-green/40 rounded-lg space-y-3">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="w-5 h-5 text-military-green shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-white">Verified session required</p>
                        <p className="text-sm text-gray-300 mt-1">
                          This competition requires {selectedActivityType?.displayName || type} to be
                          completed live in front of your camera. Stay in frame for the full time and
                          it posts automatically — verified work earns double points.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={goToVerifiedSession}
                      className="w-full bg-military-green hover:bg-military-green-dark text-forest-green font-medium"
                      data-testid="button-start-verified-session"
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Start Verified Session
                    </Button>
                  </div>
                )}

                {/* Optional verified-session shortcut for types that support it */}
                {type && !requiresVerifiedSession && supportsVerifiedSession && (
                  <div className="mt-3 p-3 bg-tactical-gray-lighter rounded-lg border border-military-green/30 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-military-green inline mr-1" />
                      Prefer proof over photos? Do this as a camera-verified session — verified work earns double points.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={goToVerifiedSession}
                      className="shrink-0 border-military-green/50 text-military-green hover:bg-military-green/20"
                      data-testid="button-optional-verified-session"
                    >
                      Verify live
                    </Button>
                  </div>
                )}
              </div>

              {/* Quantity Input */}
              {type && !requiresVerifiedSession && (
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
              {type && !requiresVerifiedSession && (
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
              {type && !requiresVerifiedSession && requiresTextInput && (
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
              {!requiresVerifiedSession && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label className="text-gray-300 font-medium">Evidence {(selectedWorkoutHkId || passiveMetricDate) ? <span className="text-gray-400">(optional — Apple Health is the evidence)</span> : <><span className="text-red-400">*</span> <span className="text-gray-400">(at least 1 photo or video)</span></>}</Label>
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
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowTeamProgressInfo((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 p-3 bg-tactical-gray-lighter rounded-lg border border-military-green/30 text-sm text-white font-medium text-left"
                    data-testid="button-team-progress-info"
                  >
                    How will your submission impact your team's progress?
                    {showTeamProgressInfo ? <ChevronUp className="w-4 h-4 shrink-0 text-military-green" /> : <ChevronDown className="w-4 h-4 shrink-0 text-military-green" />}
                  </button>
                  {showTeamProgressInfo && (
                    <div className="p-3 bg-tactical-gray-lighter/40 border border-military-green/20 rounded-lg">
                      <p className="text-sm text-gray-300" data-testid="text-team-progress-info">
                        Your team's progress is a collection of each member's submissions.
                        Example: total goal 1,000 reps — you submit 100 reps and a teammate
                        submits 100 reps, so your team has made 20% progress (represented on the map).
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowUserPointsInfo((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 p-3 bg-tactical-gray-lighter rounded-lg border border-military-green/30 text-sm text-white font-medium text-left"
                    data-testid="button-user-points-info"
                  >
                    How will I gain user points from this submission?
                    {showUserPointsInfo ? <ChevronUp className="w-4 h-4 shrink-0 text-military-green" /> : <ChevronDown className="w-4 h-4 shrink-0 text-military-green" />}
                  </button>
                  {showUserPointsInfo && (
                    <div className="p-3 bg-military-green/20 border border-military-green/30 rounded-lg">
                      <p className="text-sm text-green-300" data-testid="text-points-preview">
                        User points (points you earn, separate from competition progress) are awarded
                        per minute or rep x2. Example: a 20 minute run earns 40 pts. Plus a 15 pts
                        bonus if you include a photo and 30 pts for video. User points can be used
                        to enter paid competitions for free in the future.
                        {quantity && selectedActivityType ? (
                          <> This submission earns <strong>{activityPoints(selectedActivityType.measurementUnit, quantity, imageFiles.length > 0, !!videoFile)}</strong> points with your current evidence.</>
                        ) : null}
                      </p>
                    </div>
                  )}
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
                <p className="text-[11px] leading-snug text-gray-400" data-testid="text-evidence-limits">
                  Photos: up to {MAX_IMAGES_PER_ACTIVITY}, {formatBytes(MAX_IMAGE_UPLOAD_BYTES)} each. Video: one MP4 or MOV up to {formatBytes(MAX_VIDEO_UPLOAD_BYTES)} — about 1–2 minutes at 1080p, less at 4K. Keep the app open while it uploads.
                </p>

                {/* Why the last photo/video was rejected or failed to upload */}
                {mediaError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-xs leading-snug text-red-200"
                    data-testid="text-media-error"
                  >
                    {mediaError}
                  </div>
                )}

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
                  <div className="space-y-1">
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
                        disabled={isBusy}
                        aria-label="Remove video"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-[11px] text-gray-400" data-testid="text-video-details">
                      {videoDurationSec ? `${formatDuration(videoDurationSec)} · ` : ""}
                      {formatBytes(videoFile.size)} — ready to upload when you submit
                    </p>
                  </div>
                )}
              </div>
              )}

          {/* Upload progress bar — covers the video upload AND the final save */}
          {isBusy && (
            <div className="space-y-1" data-testid="status-upload-progress">
              <div className="flex justify-between gap-3 text-xs text-gray-400">
                <span>{uploadStatus || "Uploading — please keep this open…"}</span>
                <span className="shrink-0">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-military-green h-2 rounded-full transition-all duration-300 text-forest-green"
                  style={{ width: `${uploadProgress || 5}%` }}
                />
              </div>
              {uploadProgress === 100 ? (
                <p className="text-xs text-gray-400">Processing on server...</p>
              ) : videoFile ? (
                <p className="text-xs text-gray-400">
                  Stay on this screen until it reaches 100% — leaving the app pauses the upload.
                </p>
              ) : null}
            </div>
          )}

          {/* Submit Button — hidden when the type must go through a verified session */}
          {!requiresVerifiedSession && (
          <div className="space-y-2">
            <Button
              type="submit"
              className="w-full bg-military-green hover:bg-military-green-dark text-forest-green font-medium py-3"
              disabled={isBusy || missingForSubmit.length > 0}
              data-testid="button-submit-activity"
            >
              {isBusy
                ? uploadProgress > 0 ? `Uploading ${uploadProgress}%` : "Preparing..."
                : "Submit Activity"}
            </Button>
            {!isBusy && missingForSubmit.length > 0 && (
              <p className="text-xs text-center text-gray-400" data-testid="text-submit-requirements">
                To submit: {missingForSubmit.join(", ")}.
              </p>
            )}
          </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
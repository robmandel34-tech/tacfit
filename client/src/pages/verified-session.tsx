import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, ShieldCheck, Timer, X, AlertTriangle, CheckCircle, Eye } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { API_BASE, apiRequest } from "@/lib/queryClient";
import { getCachedAuthToken, loadAuthToken } from "@/lib/authToken";
import { celebrate } from "@/lib/celebrate";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";

// Camera-verified focus session: the camera confirms a person stays in frame
// for the full duration. Leaving the frame too long, backgrounding the app,
// or quitting voids the session — no points. Detection runs fully on-device;
// no video is ever recorded or uploaded.

const QUICK_MINUTES = [5, 10, 15, 20, 30];
const OUT_OF_FRAME_WARN_MS = 10_000; // show "come back" warning
const OUT_OF_FRAME_VOID_MS = 25_000; // void the session
const DETECT_INTERVAL_MS = 600;

// Movement verification (reps mode, e.g. push-ups): on-device pose detection
// tracks the body and counts a rep each time the elbows bend past the "down"
// angle and extend back past the "up" angle. No face requirement — the body
// just has to stay in view. No audio check either (workouts are noisy).
const QUICK_REPS = [10, 15, 20, 30, 50];
const REP_DETECT_INTERVAL_MS = 150; // faster loop so no rep is missed
const REP_MIN_INTERVAL_MS = 900; // fastest plausible rep — filters jitter
const REP_SESSION_MAX_MINUTES = 20; // finish the set within this window
// Pose landmark indices (MediaPipe): shoulders/elbows/wrists and hips/knees/ankles.
const L_SHOULDER = 11, R_SHOULDER = 12, L_ELBOW = 13, R_ELBOW = 14, L_WRIST = 15, R_WRIST = 16;
const L_HIP = 23, R_HIP = 24, L_KNEE = 25, R_KNEE = 26, L_ANKLE = 27, R_ANKLE = 28;

// Which joint each exercise bends, and the angles that count as "down" and
// back "up". Push-ups watch the elbows; squats watch the knees; jumping jacks
// watch the arms swinging overhead; jump rope counts vertical bounces.
interface RepTracking {
  joints: [number, number, number][]; // [top, middle (the bending joint), bottom]
  downAngle: number;
  upAngle: number;
  placementHint: string;
  minIntervalMs?: number; // fastest plausible rep (defaults to REP_MIN_INTERVAL_MS)
  perLimb?: boolean; // alternating exercises: each limb runs its own rep counter
  bounce?: boolean; // jump-style: count vertical hip bounces instead of joint angles
}
const REP_TRACKING: Record<string, RepTracking> = {
  push_ups: {
    joints: [
      [L_SHOULDER, L_ELBOW, L_WRIST],
      [R_SHOULDER, R_ELBOW, R_WRIST],
    ],
    downAngle: 100,
    upAngle: 150,
    placementHint: "a side angle works best for push-ups",
  },
  squats: {
    joints: [
      [L_HIP, L_KNEE, L_ANKLE],
      [R_HIP, R_KNEE, R_ANKLE],
    ],
    downAngle: 110,
    upAngle: 160,
    placementHint: "stand back so your whole body is in view — a side angle works best for squats",
  },
  pull_ups: {
    joints: [
      [L_SHOULDER, L_ELBOW, L_WRIST],
      [R_SHOULDER, R_ELBOW, R_WRIST],
    ],
    downAngle: 90,
    upAngle: 150,
    placementHint: "face the camera with your whole upper body and the bar in view",
  },
  lunges: {
    joints: [
      [L_HIP, L_KNEE, L_ANKLE],
      [R_HIP, R_KNEE, R_ANKLE],
    ],
    downAngle: 110,
    upAngle: 160,
    placementHint: "stand back so your whole body is in view — a side angle works best for lunges",
    perLimb: true,
  },
  burpees: {
    joints: [
      [L_HIP, L_KNEE, L_ANKLE],
      [R_HIP, R_KNEE, R_ANKLE],
    ],
    downAngle: 100,
    upAngle: 160,
    placementHint: "stand back so your whole body stays in view for the whole movement",
    minIntervalMs: 1500,
  },
  rowing: {
    joints: [
      [L_SHOULDER, L_ELBOW, L_WRIST],
      [R_SHOULDER, R_ELBOW, R_WRIST],
    ],
    downAngle: 90,
    upAngle: 150,
    placementHint: "a side angle of you on the rower works best — each stroke counts as a rep",
    minIntervalMs: 1000,
  },
  jumping_jacks: {
    // Arm swing: hip→shoulder→wrist angle is small at your sides, large overhead.
    joints: [
      [L_HIP, L_SHOULDER, L_WRIST],
      [R_HIP, R_SHOULDER, R_WRIST],
    ],
    downAngle: 45,
    upAngle: 130,
    placementHint: "face the camera with your whole body — including your hands overhead — in view",
    minIntervalMs: 600,
  },
  mountain_climbers: {
    joints: [
      [L_HIP, L_KNEE, L_ANKLE],
      [R_HIP, R_KNEE, R_ANKLE],
    ],
    downAngle: 100,
    upAngle: 150,
    placementHint: "a side angle in plank position works best — each knee drive counts as a rep",
    perLimb: true,
    minIntervalMs: 400,
  },
  jump_rope: {
    joints: [],
    downAngle: 0,
    upAngle: 0,
    placementHint: "face the camera with your whole body in view — each jump counts as a rep",
    bounce: true,
    minIntervalMs: 300,
  },
};
const DEFAULT_REP_TRACKING = REP_TRACKING.push_ups;

// Jump detection (jump rope): the hips must rise by this fraction of the
// visible torso length (shoulder→hip) to count as leaving the ground, then
// settle back near the baseline to complete the jump.
const BOUNCE_UP_FRACTION = 0.22;
const BOUNCE_DOWN_FRACTION = 0.1;

// Time-mode activities where the face is often hidden (yoga poses), so
// presence is verified by full-body pose tracking instead of face detection.
// No mic check either — home yoga often has music or a guided video playing.
const POSE_PRESENCE_ACTIVITIES = new Set(["yoga"]);

function jointAngle(lm: any[], s: number, e: number, w: number): number | null {
  const a = lm[s], b = lm[e], c = lm[w];
  if (!a || !b || !c) return null;
  const vis = Math.min(a.visibility ?? 1, b.visibility ?? 1, c.visibility ?? 1);
  if (vis < 0.5) return null;
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const m1 = Math.hypot(v1.x, v1.y);
  const m2 = Math.hypot(v2.x, v2.y);
  if (m1 === 0 || m2 === 0) return null;
  const cos = Math.min(1, Math.max(-1, dot / (m1 * m2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

// Audio verification: the mic samples room loudness (never recorded). The
// first seconds establish the room's baseline; the noise threshold sits well
// above it, so quiet background hum passes. Sustained talking-level sound
// (TV, work call, conversation) keeps the rolling window "loud" — brief
// one-off sounds (cough, door, siren) don't.
const AUDIO_SAMPLE_MS = 500; // loudness sample rate
const AUDIO_CALIBRATION_MS = 12_000; // learn the room baseline, no enforcement
const AUDIO_WINDOW_MS = 10_000; // rolling window for the loud fraction
const AUDIO_LOUD_FRACTION = 0.3; // window is "noisy" if >30% of it is loud
const NOISE_WARN_MS = 20_000; // sustained noise before the warning shows
const NOISE_VOID_MS = 45_000; // sustained noise before the session voids
const AUDIO_ABS_FLOOR = 0.045; // absolute RMS floor for "talking-level" sound
const AUDIO_BASELINE_MULT = 3; // ... or 3x the room baseline, whichever is higher
// Cap on how far a noisy calibration can raise the threshold — starting the
// session mid-call/mid-show can't "train away" the check, because talking-level
// sound always lands above this cap.
const AUDIO_MAX_THRESHOLD = 0.09;
// Noisy time accumulates while the room is loud and only drains at half speed
// while quiet, so briefly muting every so often can't dodge the void forever.
const NOISE_DECAY_RATE = 0.5;

interface ActivityTypeRow {
  id: number;
  name: string;
  displayName: string;
  isActive: boolean;
  supportsVerifiedSessions?: boolean;
  verifiedSessionMode?: string | null; // "time" (default) or "reps"
}

type Phase = "setup" | "starting" | "practice" | "active" | "gate" | "submitting" | "done" | "voided" | "error";

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VerifiedSessionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // Optional prefill: /verified-session?type=meditation
  const prefillType = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get("type") || "";
    } catch {
      return "";
    }
  }, []);

  const [phase, setPhase] = useState<Phase>("setup");
  const [activityType, setActivityType] = useState(prefillType);
  const [minutes, setMinutes] = useState<string>("10");
  const [repsTarget, setRepsTarget] = useState<string>("20");
  const [repCount, setRepCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [outOfFrame, setOutOfFrame] = useState(false);
  const [tooNoisy, setTooNoisy] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [snapshotBlob, setSnapshotBlob] = useState<Blob | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [snapCountdown, setSnapCountdown] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [notePrivate, setNotePrivate] = useState(false);
  const snapTimerRef = useRef<number | null>(null);
  const [awardedPoints, setAwardedPoints] = useState(0);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practicePresent, setPracticePresent] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const sessionRef = useRef<{
    id: number;
    durationMinutes: number;
    startedAtMs: number;
    mode: "time" | "reps";
    targetReps?: number;
  } | null>(null);
  const repCountRef = useRef(0);
  const armPhaseRef = useRef<"up" | "down">("up");
  const limbPhasesRef = useRef<("up" | "down")[]>(["up", "up"]);
  const bouncePhaseRef = useRef<"ground" | "air">("ground");
  const bounceBaselineRef = useRef<number | null>(null);
  const lastRepAtRef = useRef(0);
  const phaseRef = useRef<Phase>("setup");
  const lastFaceSeenRef = useRef<number>(0);
  const timersRef = useRef<number[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSamplesRef = useRef<{ t: number; loud: boolean }[]>([]);
  const baselineSamplesRef = useRef<number[]>([]);
  const noiseThresholdRef = useRef<number>(AUDIO_ABS_FLOOR);
  const noisyMsRef = useRef<number>(0);
  const listenerRef = useRef<PluginListenerHandle | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const { data: activityTypes } = useQuery<ActivityTypeRow[]>({
    queryKey: ["/api/activity-types"],
  });

  const verifiableTypes = useMemo(
    () => (activityTypes || []).filter((t) => t.isActive !== false && t.supportsVerifiedSessions),
    [activityTypes],
  );

  // Default the selection once types load.
  useEffect(() => {
    if (!activityType && verifiableTypes.length > 0) {
      setActivityType(verifiableTypes[0].name);
    }
  }, [verifiableTypes, activityType]);

  const selectedType = verifiableTypes.find((t) => t.name === activityType);

  function clearTimers() {
    timersRef.current.forEach((t) => window.clearInterval(t));
    timersRef.current = [];
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (detectorRef.current) {
      try {
        detectorRef.current.close();
      } catch {
        /* already closed */
      }
      detectorRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
    }
  }

  async function voidSession(reason: string) {
    if (phaseRef.current !== "active" && phaseRef.current !== "starting") return;
    phaseRef.current = "voided";
    clearTimers();
    stopCamera();
    setVoidReason(reason);
    setPhase("voided");
    const session = sessionRef.current;
    if (session) {
      try {
        await apiRequest("POST", `/api/verified-sessions/${session.id}/void`);
      } catch {
        /* server also expires stale sessions on its own */
      }
    }
  }

  // Void if the app is backgrounded or the tab is hidden — the phone must
  // stay down and the app must stay open for the whole session.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        if (phaseRef.current === "practice") {
          stopPractice();
          return;
        }
        voidSession("You switched away from the app.");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (Capacitor.isNativePlatform()) {
      CapApp.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) {
          if (phaseRef.current === "practice") {
            stopPractice();
            return;
          }
          voidSession("You left the app during the session.");
        }
      }).then((handle) => {
        listenerRef.current = handle;
      });
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      listenerRef.current?.remove();
      clearTimers();
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startSession() {
    if (practiceLoading) return;
    const isReps = selectedType?.verifiedSessionMode === "reps";
    // Time-mode activities like yoga where presence is verified by full-body
    // pose tracking (poses hide the face) and no mic check runs.
    const posePresence = !isReps && POSE_PRESENCE_ACTIVITIES.has(activityType);
    const mins = parseInt(minutes, 10);
    const target = parseInt(repsTarget, 10);
    if (isReps) {
      if (!activityType || !target || target < 5 || target > 200) {
        toast({ title: "Pick a rep target between 5 and 200.", variant: "destructive" });
        return;
      }
    } else if (!activityType || !mins || mins < 1 || mins > 120) {
      toast({ title: "Pick an activity and a time between 1 and 120 minutes.", variant: "destructive" });
      return;
    }
    setPhase("starting");
    phaseRef.current = "starting";
    setErrorMessage("");

    // Watchdog: if anything in the start sequence silently hangs (server not
    // answering, model download stalling), fail loudly instead of sitting on
    // "Starting camera..." forever.
    const watchdog = window.setTimeout(() => {
      if (phaseRef.current !== "starting") return;
      clearTimers();
      stopCamera();
      const s = sessionRef.current;
      if (s) apiRequest("POST", `/api/verified-sessions/${s.id}/void`).catch(() => {});
      sessionRef.current = null;
      setErrorMessage("Starting took too long. Check your connection and try again.");
      setPhase("error");
      phaseRef.current = "error";
    }, 30_000);

    try {
      // 1. Create the session on the server (it records the official start time).
      const res = await apiRequest(
        "POST",
        "/api/verified-sessions",
        isReps ? { activityType, targetReps: target } : { activityType, durationMinutes: mins },
      );
      const session = await res.json();
      sessionRef.current = {
        id: session.id,
        durationMinutes: isReps ? REP_SESSION_MAX_MINUTES : mins,
        startedAtMs: Date.now(),
        mode: isReps ? "reps" : "time",
        targetReps: isReps ? target : undefined,
      };
      repCountRef.current = 0;
      armPhaseRef.current = "up";
      limbPhasesRef.current = ["up", "up"];
      bouncePhaseRef.current = "ground";
      bounceBaselineRef.current = null;
      lastRepAtRef.current = 0;
      setRepCount(0);
      setNote("");
      setNotePrivate(false);

      // 2. Open the front camera (+ microphone for time mode only — workouts
      // are naturally noisy, so reps mode skips the noise check). Audio
      // processing is disabled so we hear the room as-is (noise suppression
      // would hide the TV we're trying to detect). Sound is only measured for
      // loudness, never recorded.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: isReps || posePresence
          ? false
          : { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // 2b. Loudness meter on the mic (on-device, nothing recorded).
      let analyser: AnalyserNode | null = null;
      if (!isReps && !posePresence) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        await audioCtx.resume().catch(() => {});
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);
        audioCtxRef.current = audioCtx;
        analyserRef.current = analyser;
        audioSamplesRef.current = [];
        baselineSamplesRef.current = [];
        noiseThresholdRef.current = AUDIO_ABS_FLOOR;
        noisyMsRef.current = 0;
        setTooNoisy(false);
      }

      // 3. Load the on-device detector: pose tracking for reps mode, face
      // detection for time mode (GPU first, CPU fallback).
      const { FaceDetector, PoseLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
      );
      if (isReps || posePresence) {
        const modelAssetPath =
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
        try {
          detectorRef.current = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath, delegate: "GPU" },
            runningMode: "VIDEO",
            numPoses: 1,
          });
        } catch {
          detectorRef.current = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath, delegate: "CPU" },
            runningMode: "VIDEO",
            numPoses: 1,
          });
        }
      } else {
        const modelAssetPath =
          "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
        try {
          detectorRef.current = await FaceDetector.createFromOptions(vision, {
            baseOptions: { modelAssetPath, delegate: "GPU" },
            runningMode: "VIDEO",
            minDetectionConfidence: 0.4,
          });
        } catch {
          detectorRef.current = await FaceDetector.createFromOptions(vision, {
            baseOptions: { modelAssetPath, delegate: "CPU" },
            runningMode: "VIDEO",
            minDetectionConfidence: 0.4,
          });
        }
      }

      window.clearTimeout(watchdog);
      lastFaceSeenRef.current = Date.now(); // grace period to get settled
      setSecondsLeft(isReps ? 0 : mins * 60);
      setPhase("active");
      phaseRef.current = "active";

      // Clock driven by wall-clock time so it can't drift. Time mode counts
      // down to zero; reps mode counts up and voids at the max window.
      const started = Date.now();
      const countdown = window.setInterval(() => {
        if (phaseRef.current !== "active") return;
        const elapsed = Math.floor((Date.now() - started) / 1000);
        if (isReps) {
          setSecondsLeft(elapsed);
          if (elapsed >= REP_SESSION_MAX_MINUTES * 60) {
            voidSession(
              `Time's up — a verified set has to be finished within ${REP_SESSION_MAX_MINUTES} minutes.`,
            );
          }
          return;
        }
        const left = mins * 60 - elapsed;
        setSecondsLeft(Math.max(0, left));
        if (left <= 0) {
          finishTimer();
        }
      }, 1000);
      timersRef.current.push(countdown);

      // Presence check loop. Reps mode also counts reps from the elbow angle:
      // down past REP_DOWN_ANGLE, then back up past REP_UP_ANGLE = one rep.
      const detect = window.setInterval(() => {
        if (phaseRef.current !== "active") return;
        const video = videoRef.current;
        const detector = detectorRef.current;
        if (!video || !detector || video.readyState < 2) return;
        try {
          const now = Date.now();
          let present = false;
          if (isReps) {
            const tracking = REP_TRACKING[activityType] || DEFAULT_REP_TRACKING;
            const minInterval = tracking.minIntervalMs ?? REP_MIN_INTERVAL_MS;
            const result = detector.detectForVideo(video, performance.now());
            const lm = result.landmarks?.[0];
            // Shared rep counter: bumps the count, and ends the session at target.
            const countRep = (): boolean => {
              if (now - lastRepAtRef.current < minInterval) return false;
              lastRepAtRef.current = now;
              repCountRef.current += 1;
              setRepCount(repCountRef.current);
              if (repCountRef.current >= (sessionRef.current?.targetReps || Infinity)) {
                finishTimer();
                return true;
              }
              return false;
            };
            if (lm && lm.length > 0) {
              if (tracking.bounce) {
                // Jump counting (jump rope): track the hips' vertical position.
                // Leaving the ground = hips rise noticeably above the standing
                // baseline (relative to torso length so distance doesn't matter),
                // landing back near the baseline completes one jump.
                const lh = lm[L_HIP], rh = lm[R_HIP];
                const ls = lm[L_SHOULDER], rs = lm[R_SHOULDER];
                const vis = (p: any) => p && (p.visibility === undefined || p.visibility > 0.5);
                if (vis(lh) && vis(rh) && vis(ls) && vis(rs)) {
                  present = true;
                  const hipY = (lh.y + rh.y) / 2;
                  const torso = Math.abs(hipY - (ls.y + rs.y) / 2);
                  if (torso > 0.05) {
                    const base = bounceBaselineRef.current;
                    if (base === null) {
                      bounceBaselineRef.current = hipY;
                    } else if (bouncePhaseRef.current === "ground") {
                      // Standing baseline drifts slowly with the person.
                      bounceBaselineRef.current = base * 0.9 + hipY * 0.1;
                      if (hipY <= base - torso * BOUNCE_UP_FRACTION) {
                        bouncePhaseRef.current = "air";
                      }
                    } else if (hipY >= base - torso * BOUNCE_DOWN_FRACTION) {
                      bouncePhaseRef.current = "ground";
                      if (countRep()) return;
                    }
                  }
                }
              } else if (tracking.perLimb) {
                // Alternating exercises (lunges, mountain climbers): each side
                // runs its own down-then-up cycle so left/right both count.
                for (let i = 0; i < tracking.joints.length; i++) {
                  const [a, b, c] = tracking.joints[i];
                  const angle = jointAngle(lm, a, b, c);
                  if (angle === null) continue;
                  present = true;
                  const phase = limbPhasesRef.current[i] || "up";
                  if (phase === "up" && angle <= tracking.downAngle) {
                    limbPhasesRef.current[i] = "down";
                  } else if (phase === "down" && angle >= tracking.upAngle) {
                    limbPhasesRef.current[i] = "up";
                    if (countRep()) return;
                  }
                }
              } else {
                const angles = tracking.joints
                  .map(([a, b, c]) => jointAngle(lm, a, b, c))
                  .filter((x): x is number => x !== null);
                if (angles.length > 0) {
                  present = true;
                  const angle = angles.length === 2 ? (angles[0] + angles[1]) / 2 : angles[0];
                  if (armPhaseRef.current === "up" && angle <= tracking.downAngle) {
                    armPhaseRef.current = "down";
                  } else if (armPhaseRef.current === "down" && angle >= tracking.upAngle) {
                    armPhaseRef.current = "up";
                    if (countRep()) return;
                  }
                }
              }
            }
          } else if (posePresence) {
            // Yoga: any tracked body pose in frame counts as present — the face
            // is often hidden (downward dog, child's pose), so face detection
            // would void a perfectly good session.
            const result = detector.detectForVideo(video, performance.now());
            present = !!(result.landmarks && result.landmarks[0]?.length > 0);
          } else {
            const result = detector.detectForVideo(video, performance.now());
            present = !!(result.detections && result.detections.length > 0);
          }
          if (present) {
            lastFaceSeenRef.current = now;
            setOutOfFrame(false);
          } else {
            const away = now - lastFaceSeenRef.current;
            if (away >= OUT_OF_FRAME_VOID_MS) {
              voidSession(
                isReps
                  ? "The camera lost sight of you for too long."
                  : "You were out of the camera frame too long.",
              );
            } else if (away >= OUT_OF_FRAME_WARN_MS) {
              setOutOfFrame(true);
            }
          }
        } catch {
          /* skip this frame */
        }
      }, isReps ? REP_DETECT_INTERVAL_MS : DETECT_INTERVAL_MS);
      timersRef.current.push(detect);

      // Noise check loop (time mode only): calibrate to the room first, then
      // void only on SUSTAINED talking-level sound (TV, call, conversation).
      const audioStarted = Date.now();
      const audioData = analyser ? new Uint8Array(analyser.fftSize) : new Uint8Array(0);
      const audioLoop = window.setInterval(() => {
        if (phaseRef.current !== "active") return;
        const a = analyserRef.current;
        if (!a) return;
        a.getByteTimeDomainData(audioData);
        let sumSquares = 0;
        for (let i = 0; i < audioData.length; i++) {
          const v = (audioData[i] - 128) / 128;
          sumSquares += v * v;
        }
        const rms = Math.sqrt(sumSquares / audioData.length);
        const now = Date.now();

        if (now - audioStarted < AUDIO_CALIBRATION_MS) {
          // Learn how loud this room normally is; no enforcement yet.
          baselineSamplesRef.current.push(rms);
          return;
        }
        if (baselineSamplesRef.current.length > 0) {
          const sorted = [...baselineSamplesRef.current].sort((x, y) => x - y);
          const median = sorted[Math.floor(sorted.length / 2)];
          // Bounded on both ends: a quiet room can't lower it below the floor,
          // and a deliberately loud calibration can't raise it past the cap.
          noiseThresholdRef.current = Math.min(
            AUDIO_MAX_THRESHOLD,
            Math.max(AUDIO_ABS_FLOOR, median * AUDIO_BASELINE_MULT),
          );
          baselineSamplesRef.current = [];
        }

        const samples = audioSamplesRef.current;
        samples.push({ t: now, loud: rms >= noiseThresholdRef.current });
        while (samples.length > 0 && now - samples[0].t > AUDIO_WINDOW_MS) {
          samples.shift();
        }
        const loudCount = samples.filter((s) => s.loud).length;
        const windowNoisy =
          samples.length >= 4 && loudCount / samples.length > AUDIO_LOUD_FRACTION;

        // Cumulative with slow decay: loud time adds up in full; quiet time
        // only drains it at half speed, so alternating noise and short quiet
        // gaps still marches toward the void.
        if (windowNoisy) {
          noisyMsRef.current += AUDIO_SAMPLE_MS;
        } else {
          noisyMsRef.current = Math.max(0, noisyMsRef.current - AUDIO_SAMPLE_MS * NOISE_DECAY_RATE);
        }

        if (noisyMsRef.current >= NOISE_VOID_MS) {
          voidSession(
            "Too much talking or background noise — a verified session needs a reasonably quiet space.",
          );
        } else if (noisyMsRef.current >= NOISE_WARN_MS) {
          setTooNoisy(true);
        } else if (noisyMsRef.current < NOISE_WARN_MS / 2) {
          setTooNoisy(false);
        }
      }, AUDIO_SAMPLE_MS);
      timersRef.current.push(audioLoop);

      // Presence heartbeat: the server requires steady pings (only counted
      // ~30s apart) to accept the session, so completion can't be faked from
      // outside this page. Only ping while the person is actually in frame.
      const sessionId = sessionRef.current?.id;
      const heartbeat = window.setInterval(() => {
        if (phaseRef.current !== "active" || !sessionId) return;
        if (Date.now() - lastFaceSeenRef.current > OUT_OF_FRAME_WARN_MS) return;
        apiRequest("POST", `/api/verified-sessions/${sessionId}/heartbeat`).catch(() => {
          /* transient network blips are fine — the server allows some gaps */
        });
      }, 30_000);
      timersRef.current.push(heartbeat);
      // First beat right away so short sessions have coverage from the start.
      if (sessionId) {
        apiRequest("POST", `/api/verified-sessions/${sessionId}/heartbeat`).catch(() => {});
      }
    } catch (error: any) {
      window.clearTimeout(watchdog);
      clearTimers();
      stopCamera();
      const session = sessionRef.current;
      if (session) {
        apiRequest("POST", `/api/verified-sessions/${session.id}/void`).catch(() => {});
      }
      const denied = error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError";
      const isRepsMode = selectedType?.verifiedSessionMode === "reps";
      const cameraOnly = isRepsMode || POSE_PRESENCE_ACTIVITIES.has(activityType);
      setErrorMessage(
        denied
          ? cameraOnly
            ? "Camera access was denied. Verified sessions need the camera to watch your movement. Allow access in your settings and try again."
            : "Camera or microphone access was denied. Verified sessions need both — the camera confirms you're present and the mic confirms it stays quiet. Allow access in your settings and try again."
          : "Could not start the verified session. Check your connection and try again.",
      );
      setPhase("error");
      phaseRef.current = "error";
    }
  }

  // Practice mode: live camera + real tracking, but no server session, no
  // points, and nothing voids — just a way to find the right phone placement
  // and see the rep counter respond before doing it for real.
  async function startPractice() {
    if (practiceLoading || phaseRef.current !== "setup") return;
    const isReps = selectedType?.verifiedSessionMode === "reps";
    const posePresence = !isReps && POSE_PRESENCE_ACTIVITIES.has(activityType);
    setPracticeLoading(true);
    setPracticePresent(false);
    repCountRef.current = 0;
    armPhaseRef.current = "up";
    limbPhasesRef.current = ["up", "up"];
    bouncePhaseRef.current = "ground";
    bounceBaselineRef.current = null;
    lastRepAtRef.current = 0;
    setRepCount(0);

    // Watchdog: if the camera or model load silently hangs, unlock the setup
    // buttons and show an error instead of leaving the page stuck.
    const watchdog = window.setTimeout(() => {
      if (phaseRef.current !== "setup") return;
      clearTimers();
      stopCamera();
      setPracticeLoading(false);
      toast({
        title: "The camera preview took too long to start. Check your connection and try again.",
        variant: "destructive",
      });
    }, 30_000);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const { FaceDetector, PoseLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
      );
      if (isReps || posePresence) {
        const modelAssetPath =
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
        try {
          detectorRef.current = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath, delegate: "GPU" },
            runningMode: "VIDEO",
            numPoses: 1,
          });
        } catch {
          detectorRef.current = await PoseLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath, delegate: "CPU" },
            runningMode: "VIDEO",
            numPoses: 1,
          });
        }
      } else {
        const modelAssetPath =
          "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
        try {
          detectorRef.current = await FaceDetector.createFromOptions(vision, {
            baseOptions: { modelAssetPath, delegate: "GPU" },
            runningMode: "VIDEO",
            minDetectionConfidence: 0.4,
          });
        } catch {
          detectorRef.current = await FaceDetector.createFromOptions(vision, {
            baseOptions: { modelAssetPath, delegate: "CPU" },
            runningMode: "VIDEO",
            minDetectionConfidence: 0.4,
          });
        }
      }

      window.clearTimeout(watchdog);
      setPracticeLoading(false);
      setPhase("practice");
      phaseRef.current = "practice";

      const detect = window.setInterval(() => {
        if (phaseRef.current !== "practice") return;
        const video = videoRef.current;
        const detector = detectorRef.current;
        if (!video || !detector || video.readyState < 2) return;
        try {
          const now = Date.now();
          let present = false;
          if (isReps) {
            const tracking = REP_TRACKING[activityType] || DEFAULT_REP_TRACKING;
            const minInterval = tracking.minIntervalMs ?? REP_MIN_INTERVAL_MS;
            const result = detector.detectForVideo(video, performance.now());
            const lm = result.landmarks?.[0];
            const countRep = () => {
              if (now - lastRepAtRef.current < minInterval) return;
              lastRepAtRef.current = now;
              repCountRef.current += 1;
              setRepCount(repCountRef.current);
            };
            if (lm && lm.length > 0) {
              if (tracking.bounce) {
                const lh = lm[L_HIP], rh = lm[R_HIP];
                const ls = lm[L_SHOULDER], rs = lm[R_SHOULDER];
                const vis = (p: any) => p && (p.visibility === undefined || p.visibility > 0.5);
                if (vis(lh) && vis(rh) && vis(ls) && vis(rs)) {
                  present = true;
                  const hipY = (lh.y + rh.y) / 2;
                  const torso = Math.abs(hipY - (ls.y + rs.y) / 2);
                  if (torso > 0.05) {
                    const base = bounceBaselineRef.current;
                    if (base === null) {
                      bounceBaselineRef.current = hipY;
                    } else if (bouncePhaseRef.current === "ground") {
                      bounceBaselineRef.current = base * 0.9 + hipY * 0.1;
                      if (hipY <= base - torso * BOUNCE_UP_FRACTION) {
                        bouncePhaseRef.current = "air";
                      }
                    } else if (hipY >= base - torso * BOUNCE_DOWN_FRACTION) {
                      bouncePhaseRef.current = "ground";
                      countRep();
                    }
                  }
                }
              } else if (tracking.perLimb) {
                for (let i = 0; i < tracking.joints.length; i++) {
                  const [a, b, c] = tracking.joints[i];
                  const angle = jointAngle(lm, a, b, c);
                  if (angle === null) continue;
                  present = true;
                  const limbPhase = limbPhasesRef.current[i] || "up";
                  if (limbPhase === "up" && angle <= tracking.downAngle) {
                    limbPhasesRef.current[i] = "down";
                  } else if (limbPhase === "down" && angle >= tracking.upAngle) {
                    limbPhasesRef.current[i] = "up";
                    countRep();
                  }
                }
              } else {
                const angles = tracking.joints
                  .map(([a, b, c]) => jointAngle(lm, a, b, c))
                  .filter((x): x is number => x !== null);
                if (angles.length > 0) {
                  present = true;
                  const angle = angles.length === 2 ? (angles[0] + angles[1]) / 2 : angles[0];
                  if (armPhaseRef.current === "up" && angle <= tracking.downAngle) {
                    armPhaseRef.current = "down";
                  } else if (armPhaseRef.current === "down" && angle >= tracking.upAngle) {
                    armPhaseRef.current = "up";
                    countRep();
                  }
                }
              }
            }
          } else if (posePresence) {
            const result = detector.detectForVideo(video, performance.now());
            present = !!(result.landmarks && result.landmarks[0]?.length > 0);
          } else {
            const result = detector.detectForVideo(video, performance.now());
            present = !!(result.detections && result.detections.length > 0);
          }
          setPracticePresent(present);
        } catch {
          /* skip this frame */
        }
      }, isReps ? REP_DETECT_INTERVAL_MS : DETECT_INTERVAL_MS);
      timersRef.current.push(detect);
    } catch (error: any) {
      window.clearTimeout(watchdog);
      clearTimers();
      stopCamera();
      setPracticeLoading(false);
      const denied = error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError";
      toast({
        title: denied
          ? "Camera access was denied. Allow camera access in your settings to practice."
          : "Could not start the camera preview. Check your connection and try again.",
        variant: "destructive",
      });
    }
  }

  function stopPractice() {
    clearTimers();
    stopCamera();
    setPracticePresent(false);
    repCountRef.current = 0;
    setRepCount(0);
    setPhase("setup");
    phaseRef.current = "setup";
  }

  function finishTimer() {
    if (phaseRef.current !== "active") return;
    phaseRef.current = "gate";
    clearTimers();
    setOutOfFrame(false);
    setTooNoisy(false);
    setPhase("gate");
    // Keep the camera running for the optional victory snapshot.
  }

  // 3-2-1 countdown so you can sit back and pose before the shot.
  function cancelSnapshotCountdown() {
    if (snapTimerRef.current !== null) {
      window.clearInterval(snapTimerRef.current);
      snapTimerRef.current = null;
    }
    setSnapCountdown(null);
  }

  function startSnapshotCountdown() {
    if (snapTimerRef.current !== null) return;
    setSnapCountdown(3);
    let n = 3;
    snapTimerRef.current = window.setInterval(() => {
      n -= 1;
      if (n <= 0) {
        cancelSnapshotCountdown();
        takeSnapshot();
      } else {
        setSnapCountdown(n);
      }
    }, 1000);
    timersRef.current.push(snapTimerRef.current);
  }

  function takeSnapshot() {
    // Never fire after the photo gate is gone (e.g. user skipped mid-countdown).
    if (phaseRef.current !== "gate") return;
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1); // match the mirrored preview
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setSnapshotBlob(blob);
          setSnapshotUrl(URL.createObjectURL(blob));
        }
      },
      "image/jpeg",
      0.85,
    );
  }

  async function completeSession(withPhoto: boolean) {
    const session = sessionRef.current;
    if (!session) return;
    cancelSnapshotCountdown();
    setPhase("submitting");
    phaseRef.current = "submitting";
    try {
      const formData = new FormData();
      if (withPhoto && snapshotBlob) {
        formData.append("photo", snapshotBlob, "verified-session.jpg");
      }
      if (session.mode === "reps") {
        formData.append("reps", String(repCountRef.current));
      }
      if (note.trim()) {
        formData.append("note", note.trim());
        formData.append("notePrivate", notePrivate ? "true" : "false");
      }
      const token = getCachedAuthToken() ?? (await loadAuthToken());
      const res = await fetch(`${API_BASE}/api/verified-sessions/${session.id}/complete`, {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Completion failed");
      }
      const activity = await res.json();
      stopCamera();
      setAwardedPoints(activity.points || 0);
      setPhase("done");
      phaseRef.current = "done";
      celebrate();
      // Refresh everything the new activity affects — feed, points, team
      // stats, competition progress, history (mirrors the submission modal).
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/history", user?.id] });
      const prefixes = ["/api/activities", "/api/teams", "/api/team-members", "/api/competitions"];
      queryClient.invalidateQueries({
        predicate: (query) =>
          prefixes.some((p) => query.queryKey[0]?.toString()?.includes(p)),
      });
    } catch (error) {
      console.error("Verified session completion failed:", error);
      setPhase("gate");
      phaseRef.current = "gate";
      toast({
        title: "Could not post your session",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-tactical-dark flex items-center justify-center p-6">
        <p className="text-gray-400">Log in to start a verified session.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tactical-dark text-white">
      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-military-green" />
            <h1 className="text-xl font-bold">Verified Session</h1>
          </div>
          {(phase === "setup" || phase === "error" || phase === "voided" || phase === "done") && (
            <button
              onClick={() => navigate("/")}
              className="p-2 text-gray-400 hover:text-white"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* SETUP */}
        {(phase === "setup" || phase === "starting" || phase === "error") && (
          <div className="space-y-5">
            {selectedType?.verifiedSessionMode === "reps" ? (
              <p className="text-sm text-gray-400">
                Do your set live on camera — the app tracks your body and counts every rep.
                Prop your phone so it can see you clearly (
                {(REP_TRACKING[activityType] || DEFAULT_REP_TRACKING).placementHint}). Leaving
                the frame or the app voids the set. Nothing is recorded; the camera only tracks
                your movement on the device.
              </p>
            ) : POSE_PRESENCE_ACTIVITIES.has(activityType) ? (
              <p className="text-sm text-gray-400">
                Complete your practice live in front of the camera. Stand back so your whole body is
                in view — the app tracks that you stay present through your poses. Leaving the frame
                or the app voids the session. Music or a guided video is fine. Nothing is recorded;
                the camera only tracks your movement on the device.
              </p>
            ) : (
              <p className="text-sm text-gray-400">
                Complete your activity live in front of the camera. Stay in frame, keep the app open,
                and keep the room reasonably quiet — leaving, or sustained talking and TV noise,
                voids the session. Nothing is recorded; the camera only checks that you're there and
                the mic only checks the noise level.
              </p>
            )}

            {phase === "error" && (
              <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-sm text-red-200 flex gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-gray-300 block mb-2">Activity</label>
              {verifiableTypes.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No activities support verified sessions yet. Check back soon.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {verifiableTypes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActivityType(t.name)}
                      className={`rounded-lg border px-3 py-3 text-sm font-medium text-left transition-colors ${
                        activityType === t.name
                          ? "border-military-green bg-military-green/20 text-white"
                          : "border-gray-700 bg-gray-800/60 text-gray-300"
                      }`}
                    >
                      {t.displayName}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedType?.verifiedSessionMode === "reps" ? (
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-2">Rep target</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {QUICK_REPS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRepsTarget(String(r))}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                        repsTarget === String(r)
                          ? "border-military-green bg-military-green/20 text-white"
                          : "border-gray-700 bg-gray-800/60 text-gray-300"
                      }`}
                    >
                      {r} reps
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={5}
                    max={200}
                    value={repsTarget}
                    onChange={(e) => setRepsTarget(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white w-28"
                  />
                  <span className="text-sm text-gray-400">reps (5-200)</span>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-2">Duration</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {QUICK_MINUTES.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMinutes(String(m))}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium border transition-colors ${
                        minutes === String(m)
                          ? "border-military-green bg-military-green/20 text-white"
                          : "border-gray-700 bg-gray-800/60 text-gray-300"
                      }`}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white w-28"
                  />
                  <span className="text-sm text-gray-400">minutes (1-120)</span>
                </div>
              </div>
            )}

            <Button
              onClick={startSession}
              disabled={phase === "starting" || practiceLoading || verifiableTypes.length === 0}
              className="w-full bg-military-green text-forest-green font-bold py-6 text-base"
            >
              <Camera className="w-5 h-5 mr-2" />
              {phase === "starting"
                ? "Starting camera..."
                : selectedType?.verifiedSessionMode === "reps"
                  ? "Start Verified Set"
                  : "Start Verified Session"}
            </Button>

            <Button
              onClick={startPractice}
              disabled={phase === "starting" || practiceLoading || verifiableTypes.length === 0}
              variant="outline"
              className="w-full border-gray-700 bg-gray-800/60 text-gray-200 font-semibold py-5"
            >
              <Eye className="w-5 h-5 mr-2" />
              {practiceLoading ? "Opening camera..." : "Practice Camera Setup"}
            </Button>
            <p className="text-xs text-gray-500 -mt-3">
              Practice opens the camera so you can position your phone and test the tracking.
              Nothing counts and no points are involved.
            </p>
          </div>
        )}

        {/* Camera preview — shown during the session and at the photo gate */}
        <div className={phase === "practice" || phase === "active" || phase === "gate" || phase === "submitting" ? "space-y-4" : "hidden"}>
          <div className="relative rounded-xl overflow-hidden border border-gray-700 bg-black aspect-[3/4]">
            {snapshotUrl && (phase === "gate" || phase === "submitting") ? (
              <img src={snapshotUrl} alt="Your session photo" className="w-full h-full object-cover" />
            ) : null}
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover -scale-x-100 ${
                snapshotUrl && (phase === "gate" || phase === "submitting") ? "hidden" : ""
              }`}
            />
            {phase === "active" && (
              <div className="absolute inset-x-0 top-0 p-3 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
                <span className="text-xs font-semibold uppercase tracking-wide text-military-green flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" />
                  {sessionRef.current?.mode === "reps" ? "Counting" : "Verifying"}
                </span>
                <span className="text-2xl font-bold tabular-nums flex items-center gap-1">
                  <Timer className="w-5 h-5 text-military-green" />
                  {formatClock(secondsLeft)}
                </span>
              </div>
            )}
            {phase === "active" && sessionRef.current?.mode === "reps" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-7xl font-bold text-white/90 drop-shadow-lg tabular-nums">
                  {repCount}
                  <span className="text-3xl text-white/60"> / {sessionRef.current?.targetReps}</span>
                </span>
              </div>
            )}
            {phase === "active" && outOfFrame && (
              <div className="absolute inset-x-0 bottom-0 p-3 bg-red-900/80 text-center text-sm font-semibold">
                {sessionRef.current?.mode === "reps"
                  ? "Get your body back in view or the set will be voided!"
                  : "Come back into frame or the session will be voided!"}
              </div>
            )}
            {phase === "active" && !outOfFrame && tooNoisy && (
              <div className="absolute inset-x-0 bottom-0 p-3 bg-amber-900/85 text-center text-sm font-semibold">
                Too much talking or background noise — quiet things down or the session will be voided!
              </div>
            )}
            {phase === "practice" && (
              <div className="absolute inset-x-0 top-0 p-3 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent">
                <span className="text-xs font-semibold uppercase tracking-wide text-amber-400 flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  Practice — nothing counts
                </span>
                <span
                  className={`text-xs font-semibold rounded-full px-3 py-1 ${
                    practicePresent ? "bg-military-green/30 text-military-green" : "bg-red-900/70 text-red-200"
                  }`}
                >
                  {practicePresent
                    ? selectedType?.verifiedSessionMode === "reps"
                      ? "Body in view"
                      : "You're in frame"
                    : "Not in view yet"}
                </span>
              </div>
            )}
            {phase === "practice" && selectedType?.verifiedSessionMode === "reps" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-7xl font-bold text-white/90 drop-shadow-lg tabular-nums">
                  {repCount}
                </span>
              </div>
            )}
            {phase === "gate" && snapCountdown !== null && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="text-8xl font-bold text-white drop-shadow-lg tabular-nums">
                  {snapCountdown}
                </span>
              </div>
            )}
          </div>

          {phase === "practice" && (
            <>
              <p className="text-xs text-center text-gray-500">
                {selectedType?.verifiedSessionMode === "reps"
                  ? `Position your phone, then try a few reps — ${(REP_TRACKING[activityType] || DEFAULT_REP_TRACKING).placementHint}. Full range counts: all the way down, all the way up.`
                  : POSE_PRESENCE_ACTIVITIES.has(activityType)
                    ? "Position your phone so your whole body stays in view through your poses."
                    : "Position your phone so your face stays clearly in view for the whole session."}
              </p>
              <Button
                onClick={stopPractice}
                className="w-full bg-military-green text-forest-green font-bold py-5"
              >
                Done Practicing
              </Button>
            </>
          )}

          {phase === "active" && (
            <>
              <p className="text-xs text-center text-gray-500">
                {sessionRef.current?.mode === "reps"
                  ? `${selectedType?.displayName || activityType} · full reps count — all the way down, all the way up`
                  : `${selectedType?.displayName || activityType} · stay in frame · keep the app open`}
              </p>
              <Button
                variant="outline"
                onClick={() =>
                  voidSession(
                    sessionRef.current?.mode === "reps"
                      ? "You ended the set early."
                      : "You ended the session early.",
                  )
                }
                className="w-full border-gray-700 text-gray-300"
              >
                {sessionRef.current?.mode === "reps" ? "Quit set (no points)" : "Quit session (no points)"}
              </Button>
            </>
          )}

          {/* PHOTO GATE */}
          {(phase === "gate" || phase === "submitting") && (
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-lg font-bold text-military-green">Way to Muster up!</p>
                <p className="text-sm text-gray-400">
                  Session complete. Snap a quick photo for the feed?
                </p>
              </div>
              {sessionRef.current?.mode !== "reps" && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-300 block">
                    Reflection <span className="font-normal text-gray-500">(optional)</span>
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={phase === "submitting"}
                    maxLength={2000}
                    rows={3}
                    placeholder="How did it go? What came up for you?"
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white text-sm p-3 placeholder:text-gray-500 focus:outline-none focus:border-military-green resize-none"
                    data-testid="input-reflection"
                  />
                  {note.trim() && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setNotePrivate(false)}
                        disabled={phase === "submitting"}
                        className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                          !notePrivate
                            ? "border-military-green bg-military-green/20 text-white"
                            : "border-gray-700 bg-gray-800/60 text-gray-400"
                        }`}
                        data-testid="button-reflection-public"
                      >
                        Share on feed
                      </button>
                      <button
                        onClick={() => setNotePrivate(true)}
                        disabled={phase === "submitting"}
                        className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                          notePrivate
                            ? "border-military-green bg-military-green/20 text-white"
                            : "border-gray-700 bg-gray-800/60 text-gray-400"
                        }`}
                        data-testid="button-reflection-private"
                      >
                        Keep private
                      </button>
                    </div>
                  )}
                  {note.trim() && (
                    <p className="text-xs text-gray-500">
                      {notePrivate
                        ? "Only you will see this reflection."
                        : "Your reflection will show with your post on the feed."}
                    </p>
                  )}
                </div>
              )}
              {snapshotUrl ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSnapshotBlob(null);
                      if (snapshotUrl) URL.revokeObjectURL(snapshotUrl);
                      setSnapshotUrl(null);
                    }}
                    disabled={phase === "submitting"}
                    className="flex-1 border-gray-700 text-gray-300"
                  >
                    Retake
                  </Button>
                  <Button
                    onClick={() => completeSession(true)}
                    disabled={phase === "submitting"}
                    className="flex-1 bg-military-green text-forest-green font-bold"
                  >
                    {phase === "submitting" ? "Posting..." : "Post with photo"}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={startSnapshotCountdown}
                  disabled={phase === "submitting" || snapCountdown !== null}
                  className="w-full bg-military-green text-forest-green font-bold"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {snapCountdown !== null ? `Get ready... ${snapCountdown}` : "Take photo (3s timer)"}
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => completeSession(false)}
                disabled={phase === "submitting"}
                className="w-full text-gray-400"
              >
                {phase === "submitting" ? "Posting..." : "Skip — post without photo"}
              </Button>
            </div>
          )}
        </div>

        {/* VOIDED */}
        {phase === "voided" && (
          <div className="text-center space-y-4 py-8">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
            <h2 className="text-lg font-bold">Session voided</h2>
            <p className="text-sm text-gray-400">{voidReason}</p>
            <p className="text-xs text-gray-500">
              No points this time. You're always free to stop — but only a full, uninterrupted
              session counts.
            </p>
            <Button
              onClick={() => {
                sessionRef.current = null;
                setPhase("setup");
                phaseRef.current = "setup";
              }}
              className="bg-military-green text-forest-green font-bold"
            >
              Try again
            </Button>
          </div>
        )}

        {/* DONE */}
        {phase === "done" && (
          <div className="text-center space-y-4 py-8">
            <CheckCircle className="w-12 h-12 text-military-green mx-auto" />
            <h2 className="text-lg font-bold">Verified and posted!</h2>
            <p className="text-sm text-gray-400">
              {sessionRef.current?.mode === "reps" ? (
                <>
                  Your set of {repCount} camera-counted {selectedType?.displayName || activityType}{" "}
                  earned <span className="text-military-green font-bold">{awardedPoints} points</span>.
                </>
              ) : (
                <>
                  Your {sessionRef.current?.durationMinutes}-minute {selectedType?.displayName || activityType}{" "}
                  session earned <span className="text-military-green font-bold">{awardedPoints} points</span>.
                </>
              )}
            </p>
            <Button
              onClick={() => navigate("/activity-feed")}
              className="bg-military-green text-forest-green font-bold"
            >
              See it on the feed
            </Button>
          </div>
        )}

        {/* Retry from error */}
        {phase === "error" && (
          <Button
            variant="ghost"
            onClick={() => {
              setErrorMessage("");
              setPhase("setup");
              phaseRef.current = "setup";
            }}
            className="w-full text-gray-400"
          >
            Back
          </Button>
        )}
      </div>
    </div>
  );
}

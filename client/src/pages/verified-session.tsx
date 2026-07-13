import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, ShieldCheck, Timer, X, AlertTriangle, CheckCircle } from "lucide-react";
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
}

type Phase = "setup" | "starting" | "active" | "gate" | "submitting" | "done" | "voided" | "error";

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
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [outOfFrame, setOutOfFrame] = useState(false);
  const [tooNoisy, setTooNoisy] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [snapshotBlob, setSnapshotBlob] = useState<Blob | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [snapCountdown, setSnapCountdown] = useState<number | null>(null);
  const snapTimerRef = useRef<number | null>(null);
  const [awardedPoints, setAwardedPoints] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const sessionRef = useRef<{ id: number; durationMinutes: number; startedAtMs: number } | null>(null);
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
        voidSession("You switched away from the app.");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (Capacitor.isNativePlatform()) {
      CapApp.addListener("appStateChange", ({ isActive }) => {
        if (!isActive) {
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
    const mins = parseInt(minutes, 10);
    if (!activityType || !mins || mins < 1 || mins > 120) {
      toast({ title: "Pick an activity and a time between 1 and 120 minutes.", variant: "destructive" });
      return;
    }
    setPhase("starting");
    setErrorMessage("");

    try {
      // 1. Create the session on the server (it records the official start time).
      const res = await apiRequest("POST", "/api/verified-sessions", {
        activityType,
        durationMinutes: mins,
      });
      const session = await res.json();
      sessionRef.current = { id: session.id, durationMinutes: mins, startedAtMs: Date.now() };

      // 2. Open the front camera + microphone. Audio processing is disabled so
      // we hear the room as-is (noise suppression would hide the TV we're
      // trying to detect). Sound is only measured for loudness, never recorded.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // 2b. Loudness meter on the mic (on-device, nothing recorded).
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      await audioCtx.resume().catch(() => {});
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      audioSamplesRef.current = [];
      baselineSamplesRef.current = [];
      noiseThresholdRef.current = AUDIO_ABS_FLOOR;
      noisyMsRef.current = 0;
      setTooNoisy(false);

      // 3. Load the on-device face detector (GPU first, CPU fallback).
      const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
      );
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

      lastFaceSeenRef.current = Date.now(); // grace period to get settled
      setSecondsLeft(mins * 60);
      setPhase("active");
      phaseRef.current = "active";

      // Countdown driven by wall-clock time so it can't drift.
      const started = Date.now();
      const countdown = window.setInterval(() => {
        if (phaseRef.current !== "active") return;
        const left = mins * 60 - Math.floor((Date.now() - started) / 1000);
        setSecondsLeft(Math.max(0, left));
        if (left <= 0) {
          finishTimer();
        }
      }, 1000);
      timersRef.current.push(countdown);

      // Presence check loop.
      const detect = window.setInterval(() => {
        if (phaseRef.current !== "active") return;
        const video = videoRef.current;
        const detector = detectorRef.current;
        if (!video || !detector || video.readyState < 2) return;
        try {
          const result = detector.detectForVideo(video, performance.now());
          const now = Date.now();
          if (result.detections && result.detections.length > 0) {
            lastFaceSeenRef.current = now;
            setOutOfFrame(false);
          } else {
            const away = now - lastFaceSeenRef.current;
            if (away >= OUT_OF_FRAME_VOID_MS) {
              voidSession("You were out of the camera frame too long.");
            } else if (away >= OUT_OF_FRAME_WARN_MS) {
              setOutOfFrame(true);
            }
          }
        } catch {
          /* skip this frame */
        }
      }, DETECT_INTERVAL_MS);
      timersRef.current.push(detect);

      // Noise check loop: calibrate to the room first, then void only on
      // SUSTAINED talking-level sound (TV, call, conversation).
      const audioStarted = Date.now();
      const audioData = new Uint8Array(analyser.fftSize);
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
      clearTimers();
      stopCamera();
      const session = sessionRef.current;
      if (session) {
        apiRequest("POST", `/api/verified-sessions/${session.id}/void`).catch(() => {});
      }
      const denied = error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError";
      setErrorMessage(
        denied
          ? "Camera or microphone access was denied. Verified sessions need both — the camera confirms you're present and the mic confirms it stays quiet. Allow access in your settings and try again."
          : "Could not start the verified session. Check your connection and try again.",
      );
      setPhase("error");
      phaseRef.current = "error";
    }
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
      setAwardedPoints(activity.points || 50);
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
            <p className="text-sm text-gray-400">
              Complete your activity live in front of the camera. Stay in frame, keep the app open,
              and keep the room reasonably quiet — leaving, or sustained talking and TV noise,
              voids the session. Nothing is recorded; the camera only checks that you're there and
              the mic only checks the noise level.
            </p>

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

            <Button
              onClick={startSession}
              disabled={phase === "starting" || verifiableTypes.length === 0}
              className="w-full bg-military-green text-forest-green font-bold py-6 text-base"
            >
              <Camera className="w-5 h-5 mr-2" />
              {phase === "starting" ? "Starting camera..." : "Start Verified Session"}
            </Button>
          </div>
        )}

        {/* Camera preview — shown during the session and at the photo gate */}
        <div className={phase === "active" || phase === "gate" || phase === "submitting" ? "space-y-4" : "hidden"}>
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
                  <ShieldCheck className="w-4 h-4" /> Verifying
                </span>
                <span className="text-2xl font-bold tabular-nums flex items-center gap-1">
                  <Timer className="w-5 h-5 text-military-green" />
                  {formatClock(secondsLeft)}
                </span>
              </div>
            )}
            {phase === "active" && outOfFrame && (
              <div className="absolute inset-x-0 bottom-0 p-3 bg-red-900/80 text-center text-sm font-semibold">
                Come back into frame or the session will be voided!
              </div>
            )}
            {phase === "active" && !outOfFrame && tooNoisy && (
              <div className="absolute inset-x-0 bottom-0 p-3 bg-amber-900/85 text-center text-sm font-semibold">
                Too much talking or background noise — quiet things down or the session will be voided!
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

          {phase === "active" && (
            <>
              <p className="text-xs text-center text-gray-500">
                {selectedType?.displayName || activityType} · stay in frame · keep the app open
              </p>
              <Button
                variant="outline"
                onClick={() => voidSession("You ended the session early.")}
                className="w-full border-gray-700 text-gray-300"
              >
                Quit session (no points)
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
              Your {sessionRef.current?.durationMinutes}-minute {selectedType?.displayName || activityType}{" "}
              session earned <span className="text-military-green font-bold">{awardedPoints} points</span>.
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

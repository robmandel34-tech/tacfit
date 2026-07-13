---
name: Verified focus sessions
description: Anti-abuse design for camera-verified timed sessions (meditation/reading) and how the mandate flow gates submissions.
---

# Verified focus sessions — anti-abuse design

Rule: never trust the client for a verified session's outcome. Two server-side guards are load-bearing:

1. **Heartbeat coverage** — the session page pings `/api/verified-sessions/:id/heartbeat` every 30s while the face is in frame; the server only counts beats ≥20s apart and completion requires ≥70% of expected beats (one per 30s of duration). Without this, a script could just start a session, wait, and complete it for 50 pts.
2. **Atomic completion claim** — completion does a conditional `active -> completed` UPDATE and only awards points if that call made the transition. Without it, two concurrent completes both pay out (points-economy exploit).

**Why:** architect review found both holes after the first build — elapsed-time-only validation is forgeable and completion was not atomic.

**How to apply:** any future "server pays points for client-reported work" feature needs the same two ingredients: continuous liveness proof (rate-limited heartbeats or equivalent) and an atomic one-shot state transition guarding the payout.

Audio noise verification (added after the user beat the camera check by sitting on a work call during a "meditation"):
- Mic loudness only, never recorded; audio processing (noiseSuppression etc.) must be DISABLED in getUserMedia or the browser hides exactly the TV/call noise being detected.
- Threshold must be bounded on BOTH ends: absolute floor (quiet rooms) AND a hard cap on the room-baseline multiplier — otherwise starting the session mid-call "trains away" the check during calibration.
- Use cumulative noisy time with slow decay (quiet drains at half speed), never a "reset on any calm window" timer — otherwise periodic short mutes dodge the void forever.
- **Why:** first implementation had both holes (architect review); calibration-relative-only thresholds and resettable timers are the classic bypasses for any client-side environment check.

Other decisions:
- Any break voids: out of frame 10s warn / 25s void, app backgrounded, quit. Freedom to quit + zero credit is the game mechanic.
- Competition mandates (`competitions.verifiedActivities`) are enforced BOTH in the normal-activity route (rejects with `requiresVerifiedSession: true`) and in the submission modal UI (form hidden, steering panel shown). Mandate only applies while the competition is actively running.
- Detection is fully on-device (MediaPipe FaceDetector, CDN wasm); no video ever uploaded — privacy + App Store position.

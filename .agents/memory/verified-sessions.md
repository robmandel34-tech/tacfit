---
name: Verified focus sessions
description: Anti-abuse design for camera-verified sessions — timed (face presence + noise) and reps mode (pose-counted push-ups) — and how the mandate flow gates submissions.
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

Reps mode (movement-verified sets, first: push-ups — added 2026-07-13):
- The activity type decides the mode (`activity_types.verified_session_mode = 'reps'`), never the client — otherwise a client could pick the easier check.
- The admin form MUST expose that mode. Until 2026-09-20 it didn't, so every admin-created type defaulted to timed — the user's production "Push Ups" (unit "Reps") ran a minutes timer. Now: admin selector + server infers reps from a reps unit when older builds omit the field, and reps mode is refused unless the name maps to a supported counter (shared/verified-session-mode.ts is the single list; names are matched free-form, e.g. "Push Ups"/"Pull-Ups"). Existing stale rows are NOT backfilled — fix them via Admin → Activity Types → edit (production "Push Ups" needed this).
- Never fall back to push-up tracking for an unknown exercise: the session page refuses to start instead (architect: silent wrong thresholds = unusable sets or bogus verified points).
- Activity-type create/edit/delete routes were fully unauthenticated until 2026-09-20; they now require an admin session (bearer bridge covers native).
- Reps are counted on-device (MediaPipe PoseLandmarker lite, joint-angle state machine with a 900ms debounce). Each exercise declares which joint bends and its down/up angles in a per-activity tracking map (push-ups: elbows; squats: knees) — adding a new rep exercise is one DB row + one map entry, no server change. No face requirement (user's explicit call: "forget about the face thing") and NO mic check — workouts are naturally noisy.
- Server backstops for a client-claimed rep count: target floor, physical plausibility (elapsed ≥ reps × 1200ms), 20-min max window, heartbeats.
- **Heartbeat coverage in reps mode must NOT use wall-clock elapsed at /complete** — the client stops pinging when the target is reached, so lingering at the optional photo gate would void legit sets (architect caught this). Use a server-derived window instead (minimum plausible set time = reps × min-ms-per-rep); never a client-influenced window like "last heartbeat time" (a cheater shrinks it by not pinging).
- **Why:** any variable-duration verified flow breaks the fixed-duration coverage math; recompute coverage from server-derived quantities only.

Other decisions:
- Any break voids: out of frame 10s warn / 25s void, app backgrounded, quit. Freedom to quit + zero credit is the game mechanic.
- Competition mandates (`competitions.verifiedActivities`) are enforced BOTH in the normal-activity route (rejects with `requiresVerifiedSession: true`) and in the submission modal UI (form hidden, steering panel shown). Mandate only applies while the competition is actively running.
- Detection is fully on-device (MediaPipe FaceDetector, CDN wasm); no video ever uploaded — privacy + App Store position.

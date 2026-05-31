---
name: HealthKit Readiness feature
description: How the readiness score is computed, gated, and displayed; common "not showing" causes.
---

# Readiness score

## Backend (server/readiness-service.ts)
- Computes a 0-100 score from synced Apple Health daily metrics vs the user's own rolling baseline.
- `state` is one of: `ready` (has a real score + a bucket of ready/moderate/fatigued/rest), `calibrating` (needs MIN_HISTORY_DAYS=14 of history first), `insufficient` (no/too-few signals).
- Test-account exception: emails in DEFAULT_TEST_EMAILS + the READINESS_TEST_EMAILS env relax the gates (minHistoryDays:1, minSignals:2, relaxBaseline) so the ring can be verified with ~1 day of data. It does NOT fabricate data — the account still needs at least one synced day.
- Owner/test-account SAMPLE fallback: GET /api/readiness/me and GET /api/readiness/team/:teamId now return a hard-coded preview readiness (score 78 / "ready") for `isReadinessTestAccount(email)` accounts when there is no real score yet (state !== "ready"). It is response-only (never persisted) and real synced data always wins. This is what makes the owner's ring show even with zero recovery signals.
- Recompute happens on every POST /api/apple-health/metrics/sync.

## Why "readiness not showing" — two independent causes
1. **Backend not published**: the test exception only takes effect once the backend is re-Published. Until then a test account computes `calibrating` (needs 14 days) and produces no score.
2. **UI hid every non-ready state**: the display helper previously returned null unless state==="ready", so calibrating/insufficient rendered NOTHING — looked broken. Fixed: `client/src/lib/readiness.ts` `getReadinessDisplay` now maps EVERY state to a visible ring + label (colored buckets, "Calibrating", and a "No data / connect health" hint with `active:false`). Used by team.tsx (teammate avatars) and profile.tsx (own profile: avatar ring + status pill + readiness card).
- **Why:** users repeatedly reported the ring "not showing" on TestFlight; the silent-null UI was the visible symptom even when the data pipeline was working.

## Display rules
- The ring/pill render when `display.active` is true (real score or calibrating). `insufficient` is `active:false` so compact views (team avatars) stay clean, but the own-profile readiness card still renders it as a "connect Apple Health" hint.
- Profile readiness is OWN-PROFILE ONLY (private health metric) via GET /api/readiness/me. Teammates' rings come from GET /api/readiness/team/:teamId (team-membership gated).

## Data caveat
- The execute_sql "production" tool points at a DIFFERENT DB than the live deployment — readiness/health_metrics rows looked empty there while deploy logs proved the live app was syncing. Trust deployment logs over that SQL tool for live readiness state.
- The owner's live test account has different numeric user IDs in the live DB vs the dev DB — match by email, not by hardcoded id.

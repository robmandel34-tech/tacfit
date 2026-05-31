---
name: HealthKit Readiness feature
description: How the readiness score is computed/gated/displayed and the common "shows no data / insufficient" causes.
---

# Readiness score

## How it scores (server/readiness-service.ts)
- 0-100 score from synced Apple Health daily metrics vs the user's own rolling baseline (mean+sd of prior days, capped at BASELINE_WINDOW_DAYS=30). HRV is the strongest, highest-weighted signal.
- States: `ready` (real score + bucket ready/moderate/fatigued/rest), `calibrating` (has < MIN_HISTORY_DAYS=14 days of history), `insufficient` (not enough scorable signals on a recent day).
- Scores the most recent day that has enough signals within SCORE_RECENCY_DAYS, not the literal newest day — the newest calendar day is usually PARTIAL (last night's overnight signals not synced yet), so scoring it directly causes a false "insufficient".
- Gate: MIN_SIGNALS=2, but at the 2-signal floor HRV must be one of the two.
- Recompute runs on every POST /api/apple-health/metrics/sync.

## #1 cause of "lots of data but still insufficient"
- **Why:** recent days often carry only HRV + SpO2 (~2 signals). Resting HR, respiratory rate, and sleep need more wear time / sleep tracking, so they're sparse on the latest days even when the overall history is rich (months). The earlier 3-signal floor + 3-day window rejected these days. Fix was to require 2 (HRV-led) and widen the recency window.
- **How to apply:** when a user reports "no readiness despite syncing," check the LATEST few days' per-signal availability, not the total day count. The bottleneck is signals-on-recent-days, not history length.

## Test-account preview mode (OFF by default)
- Emails in DEFAULT_TEST_EMAILS (currently empty) or the READINESS_TEST_EMAILS env get relaxed gates (minHistoryDays:1, minSignals:2, relaxBaseline) AND a hard-coded sample preview (score 78/"ready") when no real score exists yet. Response-only, never persisted; real data always wins. Re-enable only to demo the ring with ~1 day of data.

## Display (client/src/lib/readiness.ts getReadinessDisplay)
- Maps EVERY state to a visible ring/label so the UI never silently renders nothing (the old helper returned null unless state==="ready", which looked broken on TestFlight). `insufficient` is `active:false` so team-avatar views stay clean, but the own-profile card still shows a "connect Apple Health" hint.
- Own readiness (private) via GET /api/readiness/me; teammates via GET /api/readiness/team/:teamId (membership-gated).

## Ops notes
- Readiness/scoring lives on the backend → a fix only takes effect after Replit **Publish**; the app then recomputes on the next metrics sync. No new TestFlight build needed for scoring changes (client look-back window changes do need one).
- The `executeSql` "production" read-replica DOES match the live deployment DB (verified: same 71-day row count as deploy logs). Use it to inspect live per-signal data. Match the owner by EMAIL — user IDs differ between the dev and live DBs.

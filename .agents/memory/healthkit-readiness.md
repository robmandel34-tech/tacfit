---
name: HealthKit Readiness signals
description: Which health signals feed the Readiness score, and how HRV is read via a plugin patch
---

The Readiness score (Team-tab teammate cards) is computed server-side in
`server/readiness-service.ts` from Apple Health daily metrics.

**Signals:** HRV (heartRateVariabilitySDNN, ms), restingHeartRate,
respiratoryRate, oxygenSaturation, bodyTemperature, sleepAnalysis. HRV carries
the largest weight (0.30). Weights are renormalized over whatever signals are
present on the scored day.

**HRV requires a native plugin patch.** The published
`@perfood/capacitor-healthkit` (1.3.x) has NO HRV case in its Swift
`getSampleType` / `getTypes` / unit-mapping, so any HRV read is rejected — even
when the user clearly has HRV in Apple Health. `scripts/patch-healthkit-hrv.sh`
re-applies the three Swift insertions (HRV type mapping, read-auth scope, and a
millisecond unit) to `node_modules/.../CapacitorHealthkitPlugin.swift`. It is
idempotent and runs on EVERY build (codemagic.yaml step "Patch HealthKit plugin
for HRV support", and `scripts/cap-build.sh`) BEFORE `pod install`, because
node_modules is gitignored and reinstalled fresh, and CocoaPods compiles the
plugin Swift from node_modules.
**Why:** patch-package would need a package.json `postinstall` edit (forbidden
here / no packager tool); a committed idempotent shell patch achieves the same
without touching package.json.

**How to apply:** If HRV stops flowing, first check the patch script still
matches the plugin's Swift (it hard-fails the build if an anchor count != 1
after a plugin version bump). The client reads HRV in
`client/src/lib/healthkit.ts` (`heartRateVariabilitySDNN` in READ_SCOPES +
readDailyHealthMetrics → `hrv` field); the server already accepts/stores/scores
`hrv` end-to-end. Sleep is intentionally scored against fixed healthy targets
(7.5h duration + deep%/REM%), NOT a personal baseline — the other signals are
baseline z-scored. Readiness data only exists for iOS users who connected Apple
Health; web users have no score (ring hidden).

**Prod deployment gotcha:** The Readiness tables (`health_metrics`,
`readiness_scores`) are created in PRODUCTION only when the user clicks Publish
(Replit's publish-time schema diff). If the user reports "no readiness ring in
the TestFlight/live app," first check prod actually has these tables — a prod
read showed `relation "health_metrics" does not exist`, meaning the feature was
never published. Two independent prerequisites must both be met: (1) Publish the
Replit app so the prod DB gets the tables AND the backend gets the
`/api/readiness/*` routes; (2) a TestFlight build that POSTDATES the readiness
client code (team-tab ring + `healthkit.ts` sync), since the web bundle is baked
into the native app at build time.

**Diagnosing "ring not showing" — use deployment logs, NOT the SQL tool's prod
env.** The `execute_sql` "production" environment can point to a DIFFERENT
database than the live deployment actually uses. Observed once: the SQL-tool prod
DB had `users` (incl the test account) + `apple_health_connections/workouts` but
NO `health_metrics`/`readiness_scores` tables, while the live deployment logs
simultaneously showed `POST /api/apple-health/metrics/sync 200` and
`GET /api/readiness/team/:id 200` for that same user — i.e. the live DB clearly
HAS the tables and is storing/computing readiness. So treat the deployment logs
as the source of truth for live readiness, and don't conclude "feature not
published" just because the SQL-tool prod DB lacks the tables. The ring only
renders when `state === "ready"` (team.tsx `readinessRing` returns null
otherwise); a fresh account without the test exception sits at "calibrating"
(<14 days history) and shows no ring. If logs prove metrics are flowing but no
ring, the usual cause is the deployed backend predates the test-account
exception → re-Publish (backend-only change; no new TestFlight build needed since
the installed client already calls `metrics/sync`).

**Testing exception (no-baseline accounts):** `recomputeReadinessForUser` passes
relaxed `ReadinessOptions` for a designated test account (configured in code /
the `READINESS_TEST_EMAILS` env var): `minHistoryDays:1`, `minSignals:2`,
`relaxBaseline:true`. relaxBaseline makes directional signals fall back to an
absolute norm-based sub-score whenever a baseline z-score isn't possible (fewer
than 2 history days OR zero variance), instead of dropping the signal — so the
ring renders after a single synced day. It does NOT fabricate data; the account
still needs ≥1 synced day of real metrics. **Why:** prod is read-only to the
agent, so data cannot be seeded there; a code-level exception shipped via Publish
is the only way to let an account verify the ring before 14 days of history
accumulate.

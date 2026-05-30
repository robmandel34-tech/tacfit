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

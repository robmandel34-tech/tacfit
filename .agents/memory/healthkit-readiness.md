---
name: HealthKit Readiness signals
description: Which health signals are usable for the Readiness score and why HRV is excluded
---

The Readiness score (Team-tab teammate cards) is computed server-side in
`server/readiness-service.ts` from Apple Health daily metrics.

**Constraint:** `@perfood/capacitor-healthkit` `SampleNames` has NO HRV
(heartRateVariabilitySDNN). It exposes restingHeartRate, respiratoryRate,
oxygenSaturation, bodyTemperature, and sleepAnalysis.

**Why it matters:** HRV is normally the strongest readiness predictor (~30%
weight). It is omitted; weights are renormalized over the available signals. A
nullable `hrv` column exists in `healthMetrics` so HRV can be switched on later
(swap/fork the plugin) with no algorithm change.

**How to apply:** If asked to "add HRV" or improve readiness accuracy, the
blocker is the native plugin, not the scoring code. Sleep is intentionally
scored against fixed healthy targets (7.5h duration + deep%/REM%), NOT a personal
baseline — the other 4 signals are baseline z-scored. Readiness data only exists
for iOS users who connected Apple Health; web users have no score (ring hidden).

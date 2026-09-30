---
name: HealthKit Mindful Minutes import
description: Non-obvious constraints behind importing Apple Health mindfulSession samples as activities (plugin patch, duration units, re-auth pattern, anti-abuse rules).
---

**Rules**
- `mindfulSession` is an HKCategorySample, not an HKWorkout. The @perfood/capacitor-healthkit plugin does not expose it; a build-time patch script (same pattern as the HRV patch) adds it. The plugin's `duration` field for workouts/sleep is in HOURS — mindful rows also expose `durationSec` to avoid the same confusion.
- A mindful session's length is the start→end interval only. The server recomputes it and ignores any reported `durationSec`; sessions under the 5-minute minimum are dropped on BOTH client and server.
  **Why:** a crafted sync payload can pair a 30-second interval with a one-hour duration; `reconcileWorkoutDurationSec` trusts the larger reported value for workouts, which is fine for workouts but not for category samples.
- Mindful sessions ride through the existing `apple_health_workouts` table/flow with raw activityType "Mindful Session" (HK UUIDs are unique across sample types). Relabeling is allowed only within the mindfulness category (server-enforced at submission, client filters the dropdown).
- Exclude mindful sessions from the "hide passive Unspecified Activity when a workout exists that day" check — a meditation does not explain exercise minutes.
- Adding a new HealthKit read type does NOT re-prompt users who already authorized. Pattern: bump `HEALTHKIT_SCOPES_VERSION` (localStorage flag); re-request authorization in context (Log Activity modal open / Refresh), never at launch; the in-flight promise is module-level because several `useAppleHealth` instances (FAB, modal, settings) coexist.
- `scripts/ios-permissions.sh` overwrites Info.plist usage strings on every Codemagic build — change both places, and avoid parentheses in PlistBuddy values.

**How to apply:** any new HealthKit data type → plugin patch script + codemagic step before pod install, scopes-version bump, server-side duration/min rules, and check the passive-activity suppression logic.

**Follow-up flagged (not done, product decision):** `POST /api/activities` accepts an unauthenticated request with any `userId` (pre-existing). The submission XHR now sends the bearer header, so a server-side "session required" gate can be added once the iOS build carrying that header is the floor version.

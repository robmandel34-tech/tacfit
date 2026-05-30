---
name: HealthKit plugin quirks
description: Non-obvious behavior of @perfood/capacitor-healthkit workout data and how TacFit tracks Apple Health provenance.
---

# HealthKit plugin quirks

- The `@perfood/capacitor-healthkit` workout query (`queryHKitSampleType` with
  `sampleName: "workoutType"`) frequently returns `duration` as 0 or missing,
  which surfaced as every imported activity showing "0 min". **Always derive
  duration from the workout's `startDate`/`endDate` elapsed time when the plugin's
  `duration` is not a positive number.** The display + quantity prefill also
  fall back to start/end so already-synced rows (stored with durationSec=0) still
  show correct minutes without a re-sync.
  **Why:** the plugin field is unreliable across iOS versions/sources; start/end
  timestamps are always present.

- Apple Health provenance of a submitted activity is tracked by the
  `activities.fromAppleHealth` boolean (set server-side when a HealthKit workout
  is claimed), NOT by parsing the description text. An older `isHealthKitActivity()`
  helper in the activity card still keys off legacy "Apple HealthKit" strings for
  old data — new submissions use `fromAppleHealth` for the subtle card indicator.
  **Why:** description text is user-editable and was a fragile signal; a real
  column is authoritative.

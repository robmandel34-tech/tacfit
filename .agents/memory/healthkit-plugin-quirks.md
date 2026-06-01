---
name: HealthKit plugin quirks
description: Non-obvious behavior of @perfood/capacitor-healthkit workout data and how TacFit tracks Apple Health provenance.
---

# HealthKit plugin quirks

- The `@perfood/capacitor-healthkit` workout `duration` field is unreliable: it
  comes back 0/missing AND sometimes as an implausibly tiny value (observed 2s
  for a ~99-minute match), which surfaced as imported activities showing "0 min".
  **Rule: trust the reported active duration, but fall back to wall-clock elapsed
  (`endDate - startDate`) when reported is non-positive OR < ~20% of elapsed.**
  Do NOT use an unconditional `max(reported, elapsed)` — that inflates genuinely
  paused workouts (HealthKit `duration` excludes auto-pause, so reported being a
  bit under elapsed is correct, not a bug). One shared helper is applied at sync
  time AND in the submission UI's per-workout minutes, so already-synced rows
  with a bad stored value self-heal without a re-sync.
  **Why:** reported active time is the right metric when present; only an
  implausible gap vs. wall-clock signals the broken-plugin case.

- Apple Health provenance of a submitted activity is tracked by the
  `activities.fromAppleHealth` boolean (set server-side when a HealthKit workout
  is claimed), NOT by parsing the description text. An older `isHealthKitActivity()`
  helper in the activity card still keys off legacy "Apple HealthKit" strings for
  old data — new submissions use `fromAppleHealth` for the subtle card indicator.
  **Why:** description text is user-editable and was a fragile signal; a real
  column is authoritative.

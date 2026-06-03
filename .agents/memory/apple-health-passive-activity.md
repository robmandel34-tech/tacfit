---
name: Apple Health passive activity logging
description: How passive daily exercise minutes become a loggable "Unspecified Activity", and the double-count / timezone constraints behind it.
---

Passive Apple Health activity (a day's `exerciseMinutes` + distance, with no
recorded workout) can be logged from the Log Activity screen as an
"Unspecified Activity": the user taps it, picks a real type from the dropdown,
and submits. Points are awarded only on submit, same timing as recorded
workouts.

Per-day claim is enforced like recorded workouts: `health_metrics` has a
`submittedActivityId` marker, claimed atomically (conditional update where it
IS NULL) with rollback (delete the just-created activity) on conflict.

**Constraint — double counting:** Apple's exercise minutes already INCLUDE time
spent in recorded workouts. So if a day has a recorded workout, the passive
"Unspecified Activity" for that same day is hidden, otherwise the workout's
effort would be counted twice.
**Why:** points economy is admin-controlled and must stay accurate.

**Constraint — timezone:** the metric day (`metricDate`) is a device-LOCAL
calendar day string, while a workout's `startTime` is stored UTC. The server
cannot reliably match "same day" without the device timezone, so the
"hide passive when that day has a workout" check is done on the CLIENT (both
compared in local time), not server-side.
**How to apply:** keep the same-local-day workout check in the activity
submission modal; don't try to move it to the server without persisting the
device's local day on each workout.

**Decision — show the workout BURST, not the whole day:** crediting a full day's
`exerciseMinutes` was wrong — it bundled a real workout with incidental daily
movement. The device now derives the day's single biggest continuous "burst"
(cluster the raw `appleExerciseTime` samples, splitting only on gaps larger than
`BURST_GAP_MS` ≈ 45 min, keep the cluster with the most minutes) and totals
active energy + distance recorded in
that same window. Burst figures are stored as nullable `burst*` columns on
`health_metrics` and the UI prefers them, falling back to whole-day values when
no burst exists.
**Why:** the day total over-reported effort; users expect to log the ~40-min
workout they actually did, with its calories, like a recorded workout shows.
**How to apply:** when summing a second series (calories/distance) over a burst
window, PRORATE each sample by its overlap fraction — adding the full value on
any overlap over-credits edge-straddling samples. Always keep whole-day values
in the payload as the fallback so a no-burst day still shows real numbers.

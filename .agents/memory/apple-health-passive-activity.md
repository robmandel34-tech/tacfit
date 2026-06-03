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

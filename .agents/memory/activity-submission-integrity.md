---
name: Activity submission integrity
description: Where TacFit must enforce competition/evidence/HealthKit-import rules so points can't be farmed via crafted requests.
---

# Activity submission integrity

The activity-submission modal restricts what a user can submit (required activity
type, date window, photo-or-HealthKit evidence), but the **server must re-enforce
every one of those rules** in `POST /api/activities`. The UI is not authoritative —
a crafted multipart request can set any `type`, omit photos, or reference an
ineligible/already-used HealthKit workout.

**Rules enforced server-side (keep them there):**
- Evidence: require at least one image OR a valid owned + unsubmitted HealthKit
  workout (`healthKitWorkoutId` in the form body).
- Active competition (started, not ended, `!isCompleted`): the submitted `type`
  must be in `competition.requiredActivities`; a HealthKit import must also fall
  in the competition date window and its mapped type must match a required type.
- A HealthKit workout is one-use: link it to the created activity with an
  **atomic conditional claim** (`UPDATE ... SET submitted_activity_id WHERE id=?
  AND submitted_activity_id IS NULL`, returns false if already claimed). On claim
  failure, delete the just-created activity and return 409 *before* awarding any
  points. Do NOT link with a plain best-effort update — that races under
  concurrent requests and lets one workout mint points twice.
- `/api/apple-health/link` must never null `submitted_activity_id` (public unlink =
  reuse exploit); require a real owned `activityId` and reject relink conflicts.

**Why:** an architect review caught that doing these checks only in the React modal
let any direct API call bypass type/window/evidence rules and farm the controlled
points economy (only admins create competitions specifically to keep points scarce).

**How to apply:** any future change to activity submission, HealthKit import, or the
points award path must keep the server-side checks in lockstep with the UI — adding
a UI gate without the matching server check reopens the hole.

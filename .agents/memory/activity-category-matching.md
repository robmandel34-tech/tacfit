---
name: Activity category matching
description: How competition required-activity matching works and why it must be category-aware (shared/healthkit.ts).
---

Competitions store `requiredActivities` as a flat array of activity-type `name`
values. `activity_types` has NO category column — "cardio", "run", "swim" are
SIBLING types, not a hierarchy. So a competition that requires the umbrella
"cardio" originally rejected a synced Apple Health "Running" workout (HealthKit
"Running" maps to the specific "run" type, not "cardio").

**Rule:** matching is category-aware. An activity is allowed if its own name is
required OR the umbrella category it belongs to is required. `ACTIVITY_CATEGORY`
in `shared/healthkit.ts` maps specific names -> umbrella (cardio/strength/
flexibility/mindfulness). Requiring "run" stays strict (does NOT accept swim);
requiring "cardio" accepts all cardio members.

**Why:** users expect running to count for a cardio competition. The four
umbrella names that exist as real activity types are cardio, strength,
flexibility, mindfulness — only those act as categories.

**How to apply:** never re-introduce flat `required.includes(mappedName)`. Use
`isActivityAllowed(name, required)` (manual type) and
`isHealthKitWorkoutEligible(rawType, required)` (synced workout). They MUST be
used in lockstep at all matching sites or the dropdown shows something the
submit endpoint then rejects: 2 in server/database-storage.ts
(getEligibleWorkoutsForCompetition, getWorkoutsWithEligibility), 1 in
server/routes.ts (submission validation, both manual + synced), 1 in
client activity-submission-modal.tsx (dropdown filter).

Edge case left strict on purpose: HealthKit "crosstraining" maps to "workout",
which has no category, so it only matches if "workout" is explicitly required.

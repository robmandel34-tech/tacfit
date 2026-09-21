---
name: Onboarding survey vocabulary
description: users.fitness_archetype carries two value vocabularies (legacy + current); older iOS builds still write the legacy one, so the server must accept both.
---

# Onboarding check-in ("How would you rate your current level of fitness?")

Rule: `users.fitness_archetype` holds the fitness self-rating. Current values are `excellent` / `just_ok` / `struggling` (shared/onboarding.ts is the single list). Legacy values `servant` / `clown` / `survivor` (labels Excellent / Inconsistent / Struggling) are still written by every shipped iOS build through 1.0.4, which carries the original version of the question.

**Why:** the question was replaced by a free-text "healthy habit" question on 2026-09-19 and restored (with the "Just Ok" label) on 2026-09-20 at the user's request — two free-text questions read as duplicates. Installed apps can't be updated in lockstep, so rejecting legacy tokens would silently drop those users' answers. `healthy_habit_goal` is no longer asked but stays accepted/stored for the short-lived build that sent it.

**How to apply:** when validating or displaying `fitnessArchetype`, go through `isAcceptedFitnessLevel` / `fitnessLevelLabel` — never re-hardcode the three current values. Use own-property checks on the legacy map (the `in` operator accepts `constructor`/`__proto__`). Slack survey post fires once per user (after question 2) and is NOT env-gated — dev walkthrough runs post to the real onboarding channel.

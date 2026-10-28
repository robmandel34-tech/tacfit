---
name: Ghost accounts (admin personas)
description: Design decisions behind admin-operated "ghost" member accounts and the act-as identity swap; read before touching auth/session or anything that keys on the current user.
---

**What the user wanted (2026-10-28):** "regular users separate from my real profile", visible to everyone like any other member, and "act as any of the ghost users from one account". Not hidden, not test-only — intended for the live app.

**Rules (decided, keep consistent):**
- Ghost = `users.isGhost` row with `password = null` and an undeliverable `@ghost.invalid` email. Direct login and forgot-password are refused for ghosts; the only way in is an admin acting as one.
- Act-as swaps the *effective* identity, never the permission model: every route keeps reading `req.session.userId`, so the ghost is a plain member and admin checks correctly fail while acting. The real admin is carried separately (`req.actorUserId` for bearer, `session.actorUserId` for cookie) and is what the ghost endpoints authorize against — so an admin can switch ghost→ghost or return without logging back in.
- Acting state lives on the bearer token row (`auth_tokens.acting_as_user_id`), i.e. per device; the cookie-session branch is only a fallback. Reason: the web client's global fetch interceptor sends the bearer token with every request too, so the bearer bridge wins on web as well — persisting acting in the cookie session alone would be ignored.
- Acting as a non-ghost (real) user must be impossible (404 unless `isGhost`). `isGhost` is in the protected user-update field set and is stripped from `/api/users/:id` for anyone but self/admin.
- Apple Health connect/sync is refused server-side while acting: the phone's HealthKit data belongs to the admin and would otherwise be written into the ghost.
- Switching does a full `window.location.replace("/")` after clearing the query cache — the whole app keys on `user.id` (staleTime Infinity), so a soft swap leaves stale per-user data.

**Why:** found while building that `DELETE /api/users/:id` trusted a body `adminUserId` and skipped the check when it was absent — any caller could delete any account. Fixed to a session-based admin check in the same change; when auditing other routes, look for the same "if (bodyField) verify" pattern.

**How to apply:** anything new that is per-device or per-person (push subscriptions, HealthKit, analytics identity) should ask "does this belong to the admin or to the persona?" and gate on `getActingActorId(req)` accordingly.

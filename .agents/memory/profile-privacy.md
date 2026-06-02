---
name: Profile privacy enforcement
description: How a private TacFit profile (profilePublic=false) is enforced and which data stays public.
---

# Profile privacy model

`users.profilePublic=false` means: name, photo and points stay visible to
everyone, but activities, stats and competition history are visible ONLY to the
owner, accepted buddies, and people who share a team.

**Why:** the user explicitly chose this scope ("keep name/photo visible
everywhere, hide activities/stats/history from anyone who isn't a teammate or
buddy"). Don't silently widen or narrow it.

**How to apply:** all server-side gating goes through the
`canViewProfileDetails(viewerId, targetId)` closure in `server/routes.ts`
(own/public/accepted-friendship/shared-team => true). Any NEW endpoint that
returns a user's activities, stats, history, or team affiliation MUST call it
and return an empty result when it returns false. Endpoints already gated:
`/api/activities?userId=`, `/api/history/:userId`,
`/api/users/:id/competition-results`, `/api/team-members/:userId`. The client
reads `/api/users/:id/can-view-profile` to decide what to render.
Competition/team activity feeds (`/api/activities/competition|team/:id`) are
intentionally public — they're viewed by participants, who are teammates by
definition.

# Readiness-score sharing

`users.shareReadiness=false` removes that user from `/api/readiness/team/:teamId`
results (the requester always sees their own). On the team page an omitted
member falls back to the neutral gray "No data" ring — indistinguishable from
having no data, which is the intended privacy behavior.

# IDOR guard on user-scoped PATCH routes

`PATCH /api/users/:id/privacy` and `/readiness-sharing` require the session user
to be the target or an admin. The guard reads `req.session.userId`, which the
bearer-token bridge (top of `registerRoutes`) populates for native iOS clients,
so the same check works for web cookies and Capacitor bearer tokens.
**Why:** without it, anyone could flip another user's privacy flags by ID.

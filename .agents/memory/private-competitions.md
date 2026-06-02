---
name: Private competitions
description: How invite-only competitions work and the membership-visibility gotcha
---

# Private (invite-only) competitions

Private competitions are **unlisted**, not access-controlled. The user's explicit
design: hidden from the public join list, but **anyone with the invite link/code
can join**. Activity submissions from participants stay visible in the global feed
(do NOT filter the feed).

**Why:** organizational use — admin shares a link with a group; security-through-
obscurity is acceptable here, full access control was explicitly out of scope.

## Visibility gotcha
When deciding whether a non-admin viewer can see a private competition in
`GET /api/competitions`, you must check BOTH:
- a competition entry row (points/paid joins create these), AND
- team membership (`getUserTeam(userId, competitionId)`).

**Why:** the free team-join path (`POST /api/teams/:id/join`) only adds a team
member and never creates a competition-entry row. An entries-only check makes a
user who joined a free private comp unable to see it afterward.

---
name: Jitsi public server selection for team calls
description: How to pick/verify a free public Jitsi server for the embedded team video calls, and which ones failed.
---

The team-call feature embeds a public Jitsi server via `external_api.js`. Two
requirements: fully anonymous rooms (no "waiting for a moderator" login wall)
and iframe embedding allowed.

**Why:** meet.jit.si (since Aug 2023) and framatalk.org both showed users a
"Waiting for a moderator... please log-in" spinner — the first participant must
authenticate, which is impossible in our embedded flow. meet.ffmuc.net blocks
third-party iframes entirely (X-Frame-Options/CSP, since 2026).

**How to verify a candidate server BEFORE switching (all via curl):**
1. `curl https://<domain>/config.js | grep -E "anonymousdomain|authdomain"` —
   if EITHER appears with a real (non-example.com) value, the server uses an
   authenticated-moderator + guest split → guests get the "waiting for a
   moderator" wall. Reject it. (This marker correctly flagged meet.jit.si,
   framatalk.org, meet.systemli.org, jitsi.member.fsf.org, meet.mayfirst.org.)
2. `curl -I https://<domain>/someRandomRoom` — reject if X-Frame-Options or
   CSP frame-ancestors present (e.g. meet.infra.run: DENY).
3. `curl -I https://<domain>/external_api.js` must be 200.

Chosen server: **fairmeeting.net** (fairkom cooperative) — passes all three;
its config only sets `requireDisplayName`, which we satisfy via
`userInfo.displayName`. Backup candidate that also passed: jitsi.riot.im.

Any free public server can change policy at any time (ffmuc and jit.si did).
If calls break again with a moderator/login screen, re-run the checks above on
new candidates; long-term reliable options are self-hosting Jitsi or 8x8 JaaS
(free tier ~25 MAU, needs JWT signing).

---
name: Gating legacy endpoints breaks native raw-fetch callers
description: Many client calls use raw fetch without the bearer header; adding auth to an endpoint requires switching its callers to apiRequest or the iOS app silently breaks.
---

**Rule:** Before adding authentication to a previously-open endpoint, grep the client for raw `fetch(\`${API_BASE}...\`)` callers of it and switch them to `apiRequest` / `getQueryFn` (which attach `Authorization: Bearer`). Cookies alone are unreliable in the Capacitor WKWebView, so a raw fetch that used to work unauthenticated will start returning 401 on iOS while still working in the browser.

**Why:** Dozens of legacy call sites use raw fetch with only `credentials: "include"`. When the team-invitations endpoint was locked down, its caller had to be migrated to `apiRequest` in the same change.

**How to apply:** Any security hardening of `/api/*` routes; verify with curl (anon vs session) AND check every client call site sends the bearer header.

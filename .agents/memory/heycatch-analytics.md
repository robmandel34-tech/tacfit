---
name: HeyCatch analytics install
description: Non-obvious decisions behind the HeyCatch SDK setup (version pinning, native tracing/CORS, event attribution rules); read before touching analytics or auth flows.
---

# HeyCatch analytics (installed 2026-09-19 per heycatch.ai/agents.md)

- **Version rule:** install from the npm `latest` dist-tag only. The registry also
  carries a newer-looking `dev` tag (`x.y.z-dev.N`) that points at HeyCatch's
  staging backend — the browser console line must read `(prod)` with no `-dev`.
  **Why:** a dev build sends events nowhere useful and looks "installed".
- **frameworkVersion decision:** for `framework: 'vite-react'` we report React's
  major (18), not Vite's. **Why:** the SDK peer-depends on React and `vite-react`
  is a React app whose bundler happens to be Vite. Keep consistent if bumped.
- **Native app linking (incident 2026-09-20):** the iOS build calls the API
  cross-origin (capacitor://localhost → published backend), so `tracingHosts` is
  derived from `VITE_API_URL`. The SDK wraps posthog-js, whose lazily loaded
  `tracing-headers` extension stamps THREE headers on calls to listed hosts:
  `X-POSTHOG-SESSION-ID`, `X-POSTHOG-WINDOW-ID`, `X-POSTHOG-DISTINCT-ID`. The
  server CORS originally allowed only the first → the first TestFlight build with
  the SDK showed "all content gone", create errors and broken login. Server
  preflight now echoes `Access-Control-Request-Headers` (origin allow-list stays
  the real control). **How to recognise it:** deployment logs show only the 1–2
  launch requests (auth/me, apple-health/status — sent before the extension
  loads) and then nothing, while web + curl + DB are all healthy. Web can't
  reproduce it (same origin, no preflight). **Rule:** any new request header on
  native must be covered by CORS; test native-shaped preflights with curl
  (`Origin: capacitor://localhost` + `Access-Control-Request-Headers`).
- **Event attribution rule:** server events use the session user when present
  (`analyticsActor`) and only the request whose DB insert *won* reports an
  outcome (Stripe webhook vs client confirm, verify-email conditional update,
  invitation acceptance guarded by membership check). Onboarding reports only
  the false→true transition. **How to apply:** any new outcome route follows the
  same pattern — await `trackEvent` before `res.json`, never track on the
  already-exists/23505 branch.
- **Verification finding (2026-09-19 review, not fixed on purpose):** team join,
  generic team create, activity POST and free-entry still trust body-supplied
  user ids (pre-existing). Left as-is because older native builds call them
  without a bearer; see native-fetch-auth-gating.md before tightening.
- **Verifying locally:** headless chromium with `--enable-logging=stderr` shows
  the `[HeyCatch] SDK v… (prod) initialized` line; the source path contains
  `.vite/deps`, so don't grep-filter "vite" out of the console capture.

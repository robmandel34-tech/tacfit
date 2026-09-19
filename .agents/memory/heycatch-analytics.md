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
- **Native app linking:** the iOS build calls the API cross-origin
  (capacitor://localhost → published backend), so `tracingHosts` is derived from
  `VITE_API_URL` and the server CORS `Access-Control-Allow-Headers` must include
  `X-POSTHOG-SESSION-ID`. **Why:** the SDK's helper stamps that header on API
  calls to listed hosts; without the CORS entry every native API preflight fails.
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

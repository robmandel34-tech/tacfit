---
name: Marketing site
description: TacFit's public marketing site is a standalone static site, separate from the Express/React app.
---

# Marketing site

The public marketing/landing page lives at `marketing-site/index.html` (plus
`contact-us.html`, `privacy.html`). It is a **standalone static site deployed via
Netlify** (`marketing-site/netlify.toml`), NOT served by the Express app and not
part of the React SPA. Anchors like `#mission` are in-page sections, not app routes —
hitting `/mission` on the dev workflow 404s.

**Why this matters:** it does NOT go live through the app's standard deploy path
(Replit Publish / TestFlight). It updates through Netlify when the marketing files
are pushed/deployed. The standing 3-step app deploy reminder does not apply to
marketing-site changes.

**Domain/DNS wiring (joinmuster.com, completed 2026-06-16):** DNS is run by
**Netlify DNS** — the domain's nameservers at GoDaddy were switched to Netlify's
(`dns{1-4}.p07.nsone.net`), so ALL records are managed in Netlify's DNS panel, NOT
GoDaddy. Topology: `joinmuster.com` + `www` → the Netlify marketing site
(`tacfit.netlify.app`); `app.joinmuster.com` → the Replit app deployment (A record
to Replit's LB IP + `replit-verify=` TXT). **Why it matters:** the marketing site
and the app live on the SAME domain but different hosts — root/www on Netlify, app
on Replit. The web app is same-origin (Express serves its own frontend+API), so it
needs NO `APP_ORIGIN` env var; `app.joinmuster.com` is already hardcoded in the CORS
allowlist in `server/index.ts`. A common confusion: adding the domain in Replit/Netlify
dashboards does NOT create the DNS pointer — the A/TXT record must be added in Netlify DNS.

**Conventions:** the file uses vanilla CSS with custom `--green/--card/--border`
CSS variables (NOT Tailwind), and SMIL `<animate>` SVGs for motion. Scroll-reveal
uses an IntersectionObserver over `.reveal:not(.feature-row)`. Match these when
editing — add `.reveal` to new elements to get the fade-in.

**"How it works" flow reveal:** the staircase (`.flow`) is a separate motion system
from `.reveal` — JS adds `.anim` then `.in-view`, and CSS keyframes fire on staggered
`--d` delays per step. New time-sequenced bits keyed off this reveal must be gated by
`.flow.anim.in-view ...` AND given clean static fallbacks (default opacity so no-JS /
`prefers-reduced-motion` show a resting state, no orphan effects).

**Animating SVG limbs:** to "move" a stick-figure arm (e.g. the s5 Win fist-bump crew),
do NOT rotate the arm path — SVG rotation-origin/`transform-box` is unreliable. Instead
draw both a resting arm and a raised arm and cross-fade their opacity. Geometry is exact
(endpoints meet at computed midpoints) and there are no pivot bugs.

**Stray-dot at a line's endpoint = round stroke-linecap, not a marker.** The infil
parachute "draw the M route" effect hides/reveals the line via `stroke-dashoffset`. With
`stroke-linecap="round"`, WebKit (Safari/iOS) paints a stray DOT at the path's endpoint
whenever the line is fully hidden (default state + every loop reset) — it looks like a lone
floating marker. Fix: use `stroke-linecap="butt"` (endpoints sit under marker circles, so no
visible change). **Why:** chasing it as a marker opacity/fill-mode bug wastes attempts — the
dot is the dash-boundary cap, independent of the `.ia-pop` markers. If a single dot sits at a
drawn-line's start/end point, suspect the linecap first.

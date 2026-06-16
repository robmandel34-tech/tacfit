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

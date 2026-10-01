---
name: Marketing site (joinmuster.com)
description: Where the public landing page lives, how it deploys, and the traps hit when editing/verifying it.
---

The public landing page is a standalone static site in `marketing-site/`, deployed on Netlify (joinmuster.com) — NOT via Replit Publish or the iOS build. The app (app.joinmuster.com) is separate.

**The live site is the baseline, not the repo.** The repo copy drifted badly from what Netlify served (Sep 2026: live had a /crew page, `assets/zero-day.js`, different copy; then ~Sep 26 the user added a hero demo video `marketing/hero-loop.mp4` outside the repo). Before editing, `curl` EVERY live page plus `sitemap.xml`/`llms.txt`, diff against the repo, merge live-only changes in, then re-apply yours — on each delivery, not just the first. Netlify injects its own RUM `<script>` (netlify-rum) into served HTML — strip it from downloaded copies or it doubles up on the next deploy.

**Why:** the user edits/deploys the site outside this repo sometimes; repo edits made on the stale copy would silently revert live changes.

**How to apply:**
- Deliverable = updated `marketing-site/` folder in the repo + a zip (`marketing/joinmuster-site-<date>.zip`) presented as an asset for drag-and-drop Netlify deploy. A drag-and-drop deploy replaces the whole site, so include every live asset.
- Pretty URLs: Netlify serves `/crew` → `crew.html`, `/vs/apple-fitness` → `vs/apple-fitness.html`; a local python server needs a translate_path shim for that.
- Positioning rule (user, Oct 2026): never frame WHOOP/Fitbit/wearables as head-to-head competitors — Muster Up is the *complement* to a tracker (`/fitness-trackers`; `/vs/whoop` now 301s there). Apple Fitness+ comparison page was left as a head-to-head.
- Nav fits are tight: 7 links + button overflow the 1100px container once a label grows; every page now has nowrap + gap steps and hides inline links ≤1000px (index switches to the hamburger there — its drawer also has a `min-width` kill rule that must move with the breakpoint). Measure with CDP before changing a label.
- Homepage script strips the URL hash and pins scroll to the top for ~2s on load; cross-page deep links (`/#founder`) only work because of the `incomingHash` + `performance navigation type === 'navigate'` handling in that script — keep it if the pin logic is touched.
- Netlify Forms need `data-netlify="true"` on the `<form>` at deploy time; the three forms (crew-matchup, partner-inquiry, contact) lacked it until Sep 2026 — check the Netlify Forms dashboard if submissions are "missing".
- Product facts used on the site (user-confirmed Oct 2026): a team holds up to 10 Musters and most competitions cap it at 5 — say both, never a flat "5 max"; Zero Day free; camera-verified competitions paid later; founding crews exempt. The audit text claimed 8–30 per squad — wrong.
- Founder offer pop-up (`assets/founder-offer.js/.css`) is a Netlify Form named `founder-offer`; the hidden registration form lives only in index.html but the AJAX post works from any page. Submissions show under Forms in the Netlify dashboard; notifications must be set there.
- FAQPage JSON-LD must mirror visible FAQ text exactly; verify with a regex script after any FAQ edit.
- Headless verification: sessionStorage key `musterSplashSeen=1` skips the intro splash; dispatch a synthetic `wheel` event before programmatic scrolling or the load-time pin resets scrollY to 0. `xmllint` and `column` are not installed here.

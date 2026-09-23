---
name: Marketing site (joinmuster.com)
description: Where the public landing page lives, how it deploys, and the traps hit when editing/verifying it.
---

The public landing page is a standalone static site in `marketing-site/`, deployed on Netlify (joinmuster.com) — NOT via Replit Publish or the iOS build. The app (app.joinmuster.com) is separate.

**The live site is the baseline, not the repo.** The repo copy drifted badly from what Netlify served (Sep 2026: live had a /crew page, `assets/zero-day.js`, no hero video, different copy). Before editing, `curl` the live pages and rebuild the folder from them, then re-apply changes. Netlify injects its own RUM `<script>` (netlify-rum) into served HTML — strip it from downloaded copies or it doubles up on the next deploy.

**Why:** the user edits/deploys the site outside this repo sometimes; repo edits made on the stale copy would silently revert live changes.

**How to apply:**
- Deliverable = updated `marketing-site/` folder in the repo + a zip (`marketing/joinmuster-site-<date>.zip`) presented as an asset for drag-and-drop Netlify deploy. A drag-and-drop deploy replaces the whole site, so include every live asset.
- Pretty URLs: Netlify serves `/crew` → `crew.html`, `/vs/whoop` → `vs/whoop.html`; a local python server needs a translate_path shim for that.
- Homepage script strips the URL hash and pins scroll to the top for ~2s on load; cross-page deep links (`/#founder`) only work because of the `incomingHash` + `performance navigation type === 'navigate'` handling in that script — keep it if the pin logic is touched.
- Netlify Forms need `data-netlify="true"` on the `<form>` at deploy time; the three forms (crew-matchup, partner-inquiry, contact) lacked it until Sep 2026 — check the Netlify Forms dashboard if submissions are "missing".
- Product facts used on the site: squads are 5 max (from code, `MAX_TEAM_SIZE`), Zero Day free, camera-verified competitions paid later, founding crews exempt. The audit text claimed 8–30 per squad — wrong.
- FAQPage JSON-LD must mirror visible FAQ text exactly; verify with a regex script after any FAQ edit.
- Headless verification: sessionStorage key `musterSplashSeen=1` skips the intro splash; dispatch a synthetic `wheel` event before programmatic scrolling or the load-time pin resets scrollY to 0. `xmllint` and `column` are not installed here.

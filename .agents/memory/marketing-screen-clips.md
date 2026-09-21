---
name: Marketing screen clips
description: Rules for producing demo videos of real app screens without touching data, and the traps that silently break such captures.
---

# Marketing clips of real app screens

Rule: demo videos are rendered from the real dev app in headless Chromium; the page's API calls (including auth `/me`) are answered with scripted data at the network layer, the DOM is animated per frame, frames are screenshotted and stitched with ffmpeg. No account, session or row is created — verify by comparing users/user_sessions/auth_tokens counts before and after. Reusable tool: `scripts/marketing/`.

**Why:** the user wants real UI (not AI video) for promo material, and a throwaway DB login was rejected in review as a production-safety risk (fixed credentials, session/token residue, unguarded DB target).

**How to apply:**
- Third-party traffic must be blocked (analytics, dev banner) but fonts and Stripe.js must be allowed — a blocked Stripe.js load throws and trips Vite's dev error overlay over the screenshot.
- The parachute splash replays on every fresh sessionStorage session; mark it seen before navigating.
- Bypass the service worker so every request hits the interception.
- The floating "log activity" button covers the first leaderboard row's percentage at scroll 0; hide it for capture.
- Small progress deltas barely move the map marker; add a pulse + eased move and deliver a close-up crop alongside the full-screen clip.
- ffmpeg still-frame checks: one command per timestamp; several `-ss/-i/-frames` groups in one command all read input 0, which made a working video look frozen.

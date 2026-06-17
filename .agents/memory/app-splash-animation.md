---
name: App splash animation
description: How the in-app animated Muster splash works and why native vs web are split.
---

# In-app animated splash (parachute "drop-in")

The native iOS launch screen is a STATIC image (Apple constraint) — it cannot
animate. So the cool parachute animation is a WEB overlay, not native.

**Architecture (three layers that must show the IDENTICAL static Muster mark so
there is no flash between them):**
1. Native launch image (`ios/.../Splash.imageset` + `scripts/assets/ios-splash-master.png`)
   = static Muster mark PNG, generated from the brand SVG with ImageMagick (`magick`).
2. `client/index.html` `#tacfit-splash` first paint = inline SVG of the same mark.
3. `MusterSplash` React overlay = same mark, then animates the parachutists.

**Handoff:** `capacitor.config.ts` SplashScreen has `launchAutoHide:false`; the
native splash is dismissed only from JS (`main.tsx` calls `SplashScreen.hide()`
after first paint, with a ~2.5s safety timeout). **Why:** with auto-hide on, iOS
could hide the native image before the web layer paints, causing a flash/blank.

**When it plays:** gated by `sessionStorage('muster_splash_shown')`. Native cold
launch = fresh webview session → plays every launch; browser refreshes within a
session skip it. Single pass (~4s), tap-to-skip, reduced-motion/no-WebAnimations
falls back to a quick fade. The animation is a faithful port of the marketing
site's drop-in (`marketing-site/index.html`), re-aimed so chuters converge on the
muster point instead of drifting off-frame.

**Takes effect on iOS only via a new TestFlight build** (push → Codemagic), since
the native launch image + capacitor config ship in the native binary.

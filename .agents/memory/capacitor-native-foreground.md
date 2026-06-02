---
name: Capacitor native foreground / auto-sync
description: Why background-aware refresh on native iOS must use @capacitor/app appStateChange, not web visibilitychange or JS timers.
---

# Native foreground auto-refresh (Capacitor iOS)

On native iOS (Capacitor/WKWebView) the web `visibilitychange` event does NOT
reliably fire when the app returns from the background, and JS `setInterval`
timers are paused while the app is backgrounded. So any "refresh when the app
comes back" logic that relies only on those will appear broken on TestFlight —
the user has to manually trigger a refresh.

**Rule:** for native foreground detection, listen to the `@capacitor/app`
plugin's `App.addListener('appStateChange', ({isActive}) => ...)` and trigger
the refresh when `isActive` is true. Also run an immediate refresh on mount so a
cold launch shows fresh data. Keep the timer + `visibilitychange` as the
web/PWA fallback.

**Why:** Apple Health auto-sync was only happening on manual "Refresh" in the
TestFlight build for exactly this reason.

**How to apply:** any feature needing "do X when the app is foregrounded" on
native must use `appStateChange`. Remember every Capacitor plugin's pod must be
added to `ios/App/Podfile` by hand (Codemagic runs `cap copy`, never `cap sync`),
or the plugin is absent from the binary and the listener silently no-ops.

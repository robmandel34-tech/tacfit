---
name: Headless browser verification of authenticated pages
description: How to screenshot logged-in app pages in this repl (the Screenshot tool can't log in) and the traps hit doing it.
---

**Recipe:** `/repl/tools/bin/chromium --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage --remote-debugging-port=<p>` started as a *background* shell task, then a small Node script driving CDP over `node_modules/ws` (Target.createTarget → Page.navigate → Runtime.evaluate → Page.captureScreenshot). Log in from inside the page with `fetch('/api/auth/login')` and set `localStorage.user = JSON.stringify(response)` — the auth hook treats a missing `localStorage.user` as logged out even with a valid session cookie. Set `sessionStorage.muster_splash_shown = '1'` to skip the splash.

**Traps:**
- `pkill -f "<string>"` in the same shell command kills the shell itself when the string appears in the command line (exit -1, no output).
- Injecting a curl session cookie into the browser and then logging in in-page calls `session.regenerate`, which destroys the curl session too.
- Dev DB is a small test DB (~7 users, all competitions completed); seed temporary competitions/teams via a tsx script and delete them afterwards (FKs: activity_likes, user_sessions, competition_entries).
- `@test.com` / `@tacfit.app` emails skip email verification on register/login.
- Start chromium with the background-task option, not `( ... & )` inside a normal shell command — the browser dies as soon as that shell exits (ECONNREFUSED on the CDP port).
- Re-running a script against the same browser: `Target.createTarget` with width/height needs `newWindow: true` or it fails with "Target position can only be set for new windows".
- A workspace restart mid-session wipes /tmp (scripts, screenshots, the browser) AND can roll uncommitted file edits back several minutes; after any restart, grep for your latest edits before re-testing — a stale bundle is not the explanation.
- Several `[role="dialog"]` nodes exist on the feed page; pick the one whose textContent contains the modal title, not `querySelector`'s first hit. The activity modal's activity-type picker is a NATIVE `<select>` on web (set value via the prototype setter + `change` event); the FAB has no test id — find the fixed rounded-full button containing an `svg circle`.
- Fake files via `new File([...])` + `DataTransfer` into the hidden `input[type=file]` work; to fake a 120 MB video without allocating it, `Object.defineProperty(file, 'size', {value})`. To test upload retries, monkey-patch `XMLHttpRequest.prototype.open` to redirect the GCS PUT to `https://127.0.0.1:9/` for the first N attempts.

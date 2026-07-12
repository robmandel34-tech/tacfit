# Muster Up - Fitness Competition Platform

> **Display name: "Muster Up"** (tagline: "Find your team"). Name history:
> TacFit → MainLink → Muster → **Muster Up** (final, renamed 2026-06-17).
> The military/tactical THEME and voice ("squad", "mission", "Command Center",
> "Intel Feed") are kept. The celebration banner **"Way to Muster up!"** is an
> intentional verb pun — LEFT lowercase (do NOT turn it into "Muster Up up!").
>
> **Intentionally NOT renamed** (would break things, are invisible, or are
> deliberate puns): bundle id `com.tacfit.app` (permanent), the iOS custom
> scheme `tacfit`, all `@tacfit.app` email ADDRESSES (domain still
> SendGrid-authenticated; only display names changed), asset filenames
> containing `tacfit`, code identifiers/localStorage keys, the `MusterSplash`
> component name, the `X-Webhook-Source: TacFit-Points-Sync` header, the
> community noun "Musters" (members), and the **`joinmuster.com` domain**
> (kept per the user's 2026-06-17 decision).
>
> **Domains (verified working 2026-07-12):** `app.joinmuster.com` is connected
> to the Replit deployment (DNS lives in Netlify). Production `APP_ORIGIN` env
> var = `https://app.joinmuster.com` — it drives invite links and email links
> (email code prefers `APP_ORIGIN` over the legacy `APP_URL` secret).
> `server/index.ts` CORS allow-lists `joinmuster.com` + `www.` + `app.`,
> additive — the old `tacfit.replit.app` URL still works (TestFlight builds
> point at it via `VITE_API_URL`). The marketing site is a SEPARATE static
> Netlify site (`marketing-site/`), deployed via Netlify, not Replit.
> **User still owns:** App Store Connect display name + a fresh TestFlight
> build for the native name (no Muster-era build was ever submitted).

## Overview
Muster Up is a full-stack fitness competition platform for team-based fitness
challenges. Users create and join competitions, form teams, track activities
(Cardio, Strength, Mobility Training, Meditation), and engage through chat,
activity feeds, team video calls, buddy requests, and daily mood check-ins.
Competition winners and activity submissions earn points. Apple Health syncs
workouts automatically. The vision is a wellness platform beyond fitness,
fostering community in a tactical-themed environment.

## User Preferences
Preferred communication style: Simple, everyday language.

Team video calls: refer to them as "the video call system on fairmeeting.net" when talking to the user — do NOT call it "Jitsi" (the user associates "Jitsi" with the old meet.jit.si site we moved away from). Technically the feature still embeds Jitsi Meet software hosted at fairmeeting.net via `external_api.js` in `client/src/pages/call.tsx`.

**Standing rule — end every change with this deployment reminder:**
After ANY code change (no matter how small), always close the response with:
1. **Replit Workspace (dev preview):** auto-updated, no action.
2. **Replit Publish (live web at `.replit.app`):** click **Publish** in Replit to push live.
3. **TestFlight (iOS):** push to GitHub → Codemagic builds → uploads to TestFlight (~15-25 min).
Never omit this. The user is non-technical and relies on this list to know what to do.

## Future Feature Idea — Camera-Verified Activity Sessions (discussed 2026-07-12, not yet built)
User's vision: activities are completed "live" in front of the phone camera with
distracting apps blocked, so competition follow-through is verified instead of
honor-system. Agreed shape of the idea:
- **NOT possible:** locking the phone itself — iOS never allows it. The real
  mechanism is Apple's Screen Time / Family Controls API: block nearly all apps
  the user would doomscroll during a session (calls, texts, emergency always
  stay available — Apple enforces that). Requires applying to Apple for the
  Family Controls entitlement (approval process, needs justification).
- **Enforcement model (user's decision):** opt-in, always revocable — but ANY
  break (revoking app-blocking, leaving camera frame, quitting early, using the
  phone) voids the session: no points, no competition credit. Freedom to quit +
  zero credit = the game mechanic.
- **GPS-verified traveling exercises (added 2026-07-12 — now the EASIEST
  stage, do first):** running/biking/walking/rucking validated by GPS trail +
  time. Standard tech (Strava-style), no special Apple entitlement, and the app
  already ingests Apple Health workouts with GPS routes. Anti-cheat via sanity
  checks: sustained speed caps (car/bike vs run), teleport/straight-line
  detection, motionless stretches pause the clock, implausible pace = no
  credit. Pair GPS with motion sensors (step cadence) to counter
  phone-handed-to-a-buddy; Apple Watch workouts (wrist heart rate) are the
  strongest evidence tier.
- **Stage 1 (most feasible):** "verified focus sessions" for timed activities —
  meditation, reading, stretching, journaling. Camera verifies a person stays in
  frame and settled; phone untouched; apps blocked; timer pauses/voids on break.
  Do NOT attempt page-turn / "is it really a book" detection — flaky verification
  angers users; presence + no-phone + full time is the product.
- **Stage 2 (harder):** on-device pose detection to count reps for 2-3
  big-movement exercises (squats, push-ups). All camera processing on-device,
  no video uploaded (privacy + App Store).
- **Stage 3:** Family Controls app-blocking (needs the Apple entitlement).
- **Technical caveat:** the app is web-in-Capacitor; real-time pose tracking is
  native-level work — the largest technical lift the app would have taken on.

## System Architecture

### Core Design Principles
Military/tactical theme across UI/UX, language, and iconography — sharp edges,
green gradients, consistent branding. Single-competition-at-a-time model per
user. Tactical language throughout: "buddies," "Intel Feed," "Command Center."

### Frontend
- React 18 + TypeScript, Vite, Tailwind CSS (custom tactical theme), Radix UI /
  shadcn/ui, TanStack Query (server state), React Context (auth), Wouter (routing).

### Backend
- Node.js + Express, TypeScript ES modules, RESTful API, Multer for evidence
  uploads. Session-based auth (+ native bearer tokens) with protected routes,
  email verification, admin-only access for critical functions.

### Core Features
- **User Management**: registration, login (email/password + Apple/Google SSO),
  profiles, suspension, deletion.
- **Competitions**: creation (admin-only — single-admin setup keeps the points
  economy controlled), joining, automatic completion with rewards. ALL
  competitions (free and paid) award completion rewards: 1st place 1,000 pts
  captain / 500 pts members; 2nd place 500/250. Activity submissions also earn
  points throughout.
- **Payments**: Stripe card checkout OR points entry for paid competitions.
  Pricing derives from duration in `shared/pricing.ts` (2 weeks: $7 / 1000 pts;
  4 weeks: $14 / 2000 pts). Currently Stripe TEST mode.
  **TODO before live mode:** add a Stripe webhook on `payment_intent.succeeded`
  as server-side reconciliation (today the client confirms then calls
  `enter-with-payment`).
- **Activity Tracking**: submissions with photo/video evidence, point scoring
  with evidence bonuses, configurable text requirements. Apple HealthKit syncs
  workouts (incl. GPS route maps via Google Maps Static API).
- **Social**: buddy requests, activity feed (likes/comments), team + direct
  chat (Giphy GIFs), team video calls (fairmeeting.net embed), mission tasks,
  PWA push notifications (VAPID, granular per-type preferences).
- **Wellness**: daily mood assessments (5 bonus pts).
- **Admin Tools**: portal for competitions, users, activity types, Intel Feed
  announcements.

### Database
- PostgreSQL + Drizzle ORM; schema in `shared/`, managed with Drizzle Kit.
- Media files live in Replit object storage (GCS), not the deploy bundle.

### Email
- SendGrid (SMTP fallback). Link base URL: `APP_ORIGIN` → `APP_URL` → localhost.

## iOS Native App (Capacitor + Codemagic)

### Pipeline
Push to GitHub → Codemagic (`codemagic.yaml`) builds from the **committed
`ios/` folder** → uploads to TestFlight. Codemagic runs `npx vite build`,
`npx cap copy ios` (NEVER `cap sync`), `scripts/ios-permissions.sh` (verifies
Info.plist usage strings, fails loudly if missing), a "force fresh provisioning
profile" step, then archives. Manual Mac builds use `scripts/cap-build.sh`.

### Rules that keep breaking if forgotten
1. **Every new Capacitor plugin's pod must be added to `ios/App/Podfile` by
   hand** — `cap copy` never does it, and a missing pod means the plugin
   silently fails only in TestFlight builds (bit us for HealthKit, Preferences,
   SocialLogin).
2. `ios/App/App/capacitor.config.json` is generated by `cap copy` — edit
   `capacitor.config.ts` instead, then run `npx cap copy ios`.
3. `capacitor.config.ts` must keep `limitsNavigationsToAppBoundDomains: false`
   or the embedded video call can lose camera/mic access (2026-07-12).
4. `App.entitlements` contains ONLY `com.apple.developer.healthkit = true` —
   adding the `.access` key breaks signing (needs special Apple approval).
5. Bump `MARKETING_VERSION` in `project.pbxproj` for each new App Store
   submission (currently 1.0.4).
6. `VITE_`-prefixed env vars used by the frontend must ALSO be set in Codemagic
   for native builds (e.g. `VITE_API_URL`, SSO client ids).
- Fine-grained history of resolved build incidents (provisioning profile
  gotchas, HealthKit "not available", 401-on-native, camera-crash rejection)
  lives in the agent memory file `.agents/memory/ios-build-lessons.md`.

### Native app facts
- appId `com.tacfit.app`, display name "Muster Up" (Info.plist
  `CFBundleDisplayName`), scheme `tacfit`, min iOS 16.
- Session cookie `sameSite: 'none'` in production (cross-origin Capacitor →
  backend); native bearer token persisted via `@capacitor/preferences`; a 401
  from `/api/auth/me` clears stale auth and redirects to login.
- Splash: replace `scripts/assets/ios-splash-master.png` (2732×2732), rebuild —
  splash/icon changes require a NEW native build to show up.
- API calls prefix `VITE_API_URL` (empty = relative for web).

### Single Sign-On — Apple + Google (2026-06-14)
"Continue with Apple" / "Continue with Google" beside email/password (which
still works). One code path web + native via `@capgo/capacitor-social-login`.
Backend verifies provider tokens in `server/sso-auth.ts`, then find-or-creates
the user and issues the normal session cookie + bearer token. Matching: provider
id first, then VERIFIED provider email links to an existing account (never
unverified — account-takeover risk). `users.password` is nullable; all password
paths guard against null. Buttons stay hidden until client ids are configured:
- Apple native: nothing to configure beyond the "Sign in with Apple" capability
  on the App ID (Apple portal, one-time).
- Google native: iOS OAuth client → `VITE_GOOGLE_IOS_CLIENT_ID` +
  `GOOGLE_IOS_CLIENT_ID`, and replace `REPLACE_WITH_REVERSED_GOOGLE_IOS_CLIENT_ID`
  in `ios/App/App/Info.plist` with the reversed client id (never ship the
  placeholder — upload rejection).
- Google web: web OAuth client → `VITE_GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_ID`.
- Apple web (optional): Services ID → `VITE_APPLE_SERVICES_ID` +
  `VITE_APPLE_REDIRECT_URI` + `APPLE_SERVICES_ID`.

## External Dependencies
- **Frontend**: React, Radix UI, Tailwind CSS, TanStack Query, React Hook Form,
  date-fns, emoji-picker-react, Lucide icons.
- **Backend**: Express, Drizzle ORM, @neondatabase/serverless, Multer.
- **Services**: SendGrid (email), Stripe (payments), Giphy (chat GIFs), Google
  Maps Static API (route maps), Apple HealthKit (workout sync), Replit object
  storage / GCS (media), fairmeeting.net (team video calls).

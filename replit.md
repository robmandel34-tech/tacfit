# TacFit - Fitness Competition Platform

## Overview
TacFit is a full-stack fitness competition platform designed for team-based fitness challenges. It enables users to create and join competitions, form teams, track various activities (Cardio, Strength, Mobility Training, Meditation), and engage through social features like chat and activity feeds. The platform incorporates a reward system for competition winners, activity submissions, and daily mood assessments, and integrates with external services for automated activity tracking. The vision is to provide a comprehensive wellness platform beyond just fitness, incorporating mental health aspects and fostering community engagement in a tactical-themed environment.

## User Preferences
Preferred communication style: Simple, everyday language.

**Standing rule — end every change with this deployment reminder:**
After ANY code change (no matter how small), always close the response with:
1. **Replit Workspace (dev preview):** auto-updated, no action.
2. **Replit Publish (live web at `.replit.app`):** click **Publish** in Replit to push live.
3. **TestFlight (iOS):** push to GitHub → Codemagic builds → uploads to TestFlight (~15-25 min).
Never omit this. The user is non-technical and relies on this list to know what to do.

## System Architecture

### Core Design Principles
The platform follows a military/tactical theme across its UI/UX, language, and iconography, emphasizing sharp edges, green gradients, and consistent branding. It focuses on a single-competition-at-a-time model for users and prioritizes visual consistency across all components.

### Frontend Architecture
- **Framework**: React 18 with TypeScript.
- **Styling**: Tailwind CSS with a custom military/tactical theme, utilizing Radix UI primitives and shadcn/ui components.
- **State Management**: TanStack Query for server state and React Context for authentication.
- **Routing**: Wouter for client-side routing.
- **Build Tool**: Vite.
- **UI/UX Decisions**: Consistent tactical language ("buddies," "Intel Feed," "Command Center"), redesigned headers and cards with green gradients, interactive elements (onboarding walkthroughs, progress maps), video-first media display, enhanced chat, and improved accessibility.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **API Design**: RESTful API.
- **File Upload**: Multer for evidence uploads.
- **Security**: Admin-only access for critical functions, session-based authentication with protected routes, email verification system.
- **Core Features**:
    - **User Management**: Registration, login, profile customization, suspension, deletion.
    - **Competition Management**: Creation, joining, and automatic completion with reward distribution (configurable activity types, goals, join windows). All competitions — free and paid — award completion rewards (1st place: 1,000 pts captain / 500 pts members; 2nd place: 500 pts captain / 250 pts members). Individual activity submissions also award points throughout the competition. Only the admin (single-admin setup) can create competitions, so the points economy stays controlled.
    - **Activity Tracking**: Submission of various activity types with photo evidence, point-based scoring (including bonus points for verified evidence), and configurable text input requirements with validation.
    - **Social Features**: Buddy requests, activity feed with likes/comments, team and direct messaging chat, mission task notifications, PWA push notifications with granular control.
    - **Wellness**: Daily mood assessment system.
    - **Admin Tools**: Comprehensive admin portal for managing competitions, users, activity types, and creating Intel Feed announcements.

### Database Layer
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM for type-safe operations.
- **Schema**: Defined in a shared directory, managed with Drizzle Kit migrations.

## External Dependencies

### Frontend Dependencies
- **UI Framework**: React, Radix UI, Tailwind CSS.
- **State Management**: TanStack Query, React Hook Form.
- **Utilities**: date-fns, clsx, class-variance-authority, emoji-picker-react.
- **Icons**: Lucide React icons.

### Backend Dependencies
- **Web Framework**: Express.js.
- **Database**: Drizzle ORM, @neondatabase/serverless.
- **File Handling**: Multer.
- **APIs**: Giphy API (for GIF integration), Google Maps Static API (for route visualization).
- **External Services**: Apple HealthKit (for activity syncing, workout conversion, GPS route maps).
- **Email Service**: SendGrid.

### Development Tools
- **Build**: Vite.
- **TypeScript**: Strict type checking.
- **Linting**: ESLint.
- **Database**: Drizzle Kit.
## Capacitor iOS Setup (2026-04-02)

### What was configured
- ✅ Installed `@capacitor/core`, `@capacitor/ios`, `@capacitor/cli`, `@capacitor/status-bar`, `@capacitor/splash-screen`
- ✅ Created `capacitor.config.ts` — appId: `com.tacfit.app`, webDir: `dist/public`, dark bg `#0a0f0a`
- ✅ `client/src/lib/queryClient.ts` now prefixes all API calls with `VITE_API_URL` env var (empty string = relative, set to deployed backend URL for native builds)
- ✅ CORS updated to allow `capacitor://localhost`, `ionic://localhost`, `http://localhost`
- ✅ Session cookie: `sameSite` is `'none'` in production (required for cross-origin Capacitor ↔ backend requests), `'lax'` in development
- ✅ Build script: `scripts/cap-build.sh` — builds Vite, adds iOS, patches Info.plist, syncs Capacitor
- ✅ Permissions script: `scripts/ios-permissions.sh` — patches `Info.plist` with all required NSUsageDescription strings (camera, photos, microphone, health, notifications)

### To build for iOS (on Mac)
1. Set env var `VITE_API_URL` to your deployed backend URL (e.g. `https://tacfit.yourname.replit.app`)
2. Run: `VITE_API_URL=https://... bash scripts/cap-build.sh`
3. The script runs `scripts/ios-permissions.sh` on EVERY build now (not just the first one). It patches Info.plist with all required NSUsageDescription strings and aborts the build if any are missing — this prevents the "crash on Take Photo" rejection from Apple, which is caused by a missing `NSCameraUsageDescription`.
4. Open in Xcode: `npx cap open ios`
5. Set your Team + Bundle ID, then Archive → Distribute

### Apple Health "not available on this device" on TestFlight — native build fix (2026-05-29)
The Apple Health UI (Settings card + activity-submission prompt) showed up
correctly in the TestFlight build, but tapping **Connect** failed with
"Apple Health is not available on this device." Cause: the native HealthKit
plugin was never compiled into the iOS binary.
- `codemagic.yaml` only runs `npx cap copy ios` (web assets), never
  `npx cap sync`, so the plugin's CocoaPod was never added to the Podfile and
  `pod install` never built the native side. Calling the plugin then throws,
  which the app reports as "not available."
- There was also NO entitlements file, so HealthKit capability was off.
Fix applied (all committed under `ios/`, picked up by Codemagic's `pod install`):
1. Added `pod 'PerfoodCapacitorHealthkit', :path => '../../node_modules/@perfood/capacitor-healthkit'`
   to `ios/App/Podfile` (capacitor_pods).
2. Created `ios/App/App/App.entitlements` with ONLY `com.apple.developer.healthkit = true`.
   IMPORTANT: do NOT add `com.apple.developer.healthkit.access` — that key is the
   "HealthKit Access (Verifiable/Clinical Health Records)" capability, which needs
   special per-team approval from Apple and made the Codemagic archive fail with
   `Provisioning profile "TacFit" doesn't include the HealthKit Access (Verifiable
   Health Records) capability`. TacFit only reads workouts, so the plain
   `com.apple.developer.healthkit` boolean is all that's needed.
3. Wired `CODE_SIGN_ENTITLEMENTS = App/App.entitlements` into BOTH the Debug and
   Release App build configs in `ios/App/App.xcodeproj/project.pbxproj`.
Info.plist already has NSHealthShare/NSHealthUpdate usage strings (good).
**MANUAL step required by the user (one-time, in Apple Developer portal):**
enable the **HealthKit** capability on the App ID `com.tacfit.app`
(Certificates, Identifiers & Profiles → Identifiers → com.tacfit.app →
check **HealthKit** ONLY — leave "Recalibrate Estimates" / health records off →
Save). Codemagic (App Store Connect API integration) then regenerates the
"TacFit" provisioning profile to include HealthKit on the next build. Without the
App ID capability, signing fails with `Provisioning profile "TacFit" doesn't
include the HealthKit capability`.
To ship: push to GitHub → Codemagic builds → TestFlight (new native build).

### Provisioning profile force-recreate in Codemagic (2026-05-29)
Symptom: builds kept signing with a stale provisioning profile that had the
correct App ID but NO `com.apple.developer.healthkit` entitlement, so the
archive failed even after the App ID's HealthKit capability was enabled. Root
cause: Codemagic automatic signing reused an old profile (and a build-machine
cached copy) instead of minting a fresh one. Manually deleting the profile in
the Apple portal was unreliable.
Fix (in `codemagic.yaml`, step "Force a fresh provisioning profile with
HealthKit", runs before signing): it (1) clears locally cached
`.mobileprovision` files on the build machine, (2) looks up the Bundle ID
resource id and the EXISTING distribution certificate id(s) via
`app-store-connect bundle-ids list` / `certificates list` (it does NOT create a
certificate), (3) deletes stale App Store profiles via `app-store-connect
profiles delete`, (4) creates a fresh profile with `app-store-connect profiles
create <bundleResId> --certificate-ids <certIds> --type IOS_APP_STORE --save`
(a fresh profile automatically inherits whatever capabilities the App ID
currently has, including HealthKit), then (5) HARD-FAILS the build with a clear
message if the new profile still lacks the HealthKit entitlement. The user never
has to touch the Apple portal for profiles again. The App ID must still have the
HealthKit capability enabled (one-time, already done).

IMPORTANT lesson — do NOT use `fetch-signing-files ... --create` here: that
command also tries to CREATE a distribution certificate, which collides with the
existing Cert1 and fails with Apple 409 "you already have a current Distribution
certificate." Always reuse the existing cert and only create the PROFILE
(`profiles create`). Codemagic CLI uses grouped subcommands (`profiles list`,
`profiles delete`, `bundle-ids list`, `certificates list`), not flat names.

### Apple rejection "crashed when taking a photo" — REAL root cause (2026-05-29 fix)
The earlier theory (below, 2026-05-19) blamed `cap-build.sh` not running the
Info.plist patcher. That script is only used for MANUAL Mac builds. The actual
TestFlight/App Store builds are produced by **Codemagic** (`codemagic.yaml`),
which builds from the **committed `ios/` folder** and only ran `npx cap copy`
(web assets) — it NEVER ran the permission patcher. The committed
`ios/App/App/Info.plist` had ZERO usage-description keys, so every shipped
build was missing `NSCameraUsageDescription` and hard-crashed the moment the
camera opened (this is why the camera also failed on iPad).
Fix applied:
1. Added all usage-description keys directly to the committed
   `ios/App/App/Info.plist` (NSCamera/NSPhotoLibrary/NSPhotoLibraryAdd/
   NSMicrophone/NSHealthShare/NSHealthUpdate + ITSAppUsesNonExemptEncryption=false).
2. Added an "Ensure iOS permission usage descriptions" step to `codemagic.yaml`
   that runs `scripts/ios-permissions.sh` on every build as a belt-and-suspenders
   guarantee (it fails the build loudly if any key is missing).
To resubmit: push to GitHub → Codemagic builds → uploads to TestFlight, then
submit for review. No web/server change is involved.

### If Apple rejected with "crashed on Take Photo" (2026-05-19 fix — superseded, see above)
Cause: prior `cap-build.sh` only ran the Info.plist patcher on the first
`npx cap add ios`. Any subsequent build on an `ios/` folder that was
created before the patcher existed shipped without `NSCameraUsageDescription`,
which iOS treats as a hard crash the instant the camera UI launches.
Fix: the patcher now runs on every build AND fails loudly if any required
key is missing. To resubmit, just re-run `bash scripts/cap-build.sh`,
re-archive in Xcode, and upload — the new build will have all the
required keys.

### iOS splash screen
- Master splash lives at `scripts/assets/ios-splash-master.png` (2732×2732, TacFit shield centered on `#0a0f0a`).
- `scripts/cap-build.sh` copies it into `ios/App/App/Assets.xcassets/Splash.imageset/` (all three @1x/@2x/@3x slots) before `npx cap sync`, so every native build picks it up automatically.
- To change the splash: replace `scripts/assets/ios-splash-master.png` with a new 2732×2732 PNG, then rebuild and re-upload to TestFlight. Splash updates only take effect with a new native build — reinstalling the same TestFlight build will keep showing the old splash.

## Recent Optimizations (2025-08-21)

### Deployment Optimization
- ✅ Set up object storage for media files
- ✅ Removed 88 large media files from deployment bundle
- ✅ Reduced deployment size by 116.50 MB
- ✅ Removed 62 unused dependencies
- ✅ Optimized build process for faster deployments

### Object Storage Integration
- Media files now served from cloud storage
- Faster deployments and better performance
- Automatic CDN caching for media assets

### Competition Payments (2026-05-19) — Dev / Stripe Test Mode
- ✅ Reactivated points-based competition entry (was inactive in v1)
- ✅ Added Stripe card checkout via Stripe Elements (`@stripe/react-stripe-js`)
- ✅ Pricing is derived from competition duration in `shared/pricing.ts`:
    - 2-week competition: $7.00 or 1000 points
    - 4-week competition: $14.00 or 2000 points
- ✅ `CompetitionPaymentModal` shows both options; user picks Card or Points
- ✅ `competitions.tsx` `handleJoin` now opens the payment modal for any
     competition where `paymentType !== "free"`; free comps still skip
     straight to team selection
- ✅ Backend: `/api/create-payment-intent` and `/api/competitions/:id/enter-with-points`
     now both pull the price from `getCompetitionPricing()` — no more hardcoded
     1000 / no more client-supplied amount
- ✅ Removed a duplicate generic `/api/create-payment-intent` route that was
     shadowing the competition-specific one
- Env: dev uses `STRIPE_SECRET_KEY` (server) + `VITE_STRIPE_PUBLIC_KEY` (client)
     test-mode keys already configured in Replit Secrets
- TODO before live mode: add Stripe webhook reconciliation (currently the
     client confirms then calls `enter-with-payment`; a server webhook on
     `payment_intent.succeeded` is the belt-and-suspenders backup)

### Push Notification System (2025-08-21)
- ✅ Implemented comprehensive PWA push notification system
- ✅ VAPID authentication for secure push messaging
- ✅ Granular notification preferences for users
- ✅ Test notification functionality working
- ✅ Support for activity updates, competition events, team messages, mission tasks, and admin announcements
- ✅ Automatic fallback handling for media file loading
- ✅ Service worker integration for offline PWA capabilities

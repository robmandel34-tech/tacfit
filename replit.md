# TacFit - Fitness Competition Platform

## Overview
TacFit is a full-stack fitness competition platform designed for team-based fitness challenges. It enables users to create and join competitions, form teams, track various activities (Cardio, Strength, Mobility Training, Meditation), and engage through social features like chat and activity feeds. The platform incorporates a reward system for competition winners, activity submissions, and daily mood assessments, and integrates with external services for automated activity tracking. The vision is to provide a comprehensive wellness platform beyond just fitness, incorporating mental health aspects and fostering community engagement in a tactical-themed environment.

## User Preferences
Preferred communication style: Simple, everyday language.

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
    - **Competition Management**: Creation, joining, and automatic completion with reward distribution (configurable activity types, goals, join windows). Free competitions do not award point rewards upon completion, but individual activity submissions do. Paid competitions continue to award completion rewards.
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
3. First run also does: `npx cap add ios` + patches Info.plist
4. Open in Xcode: `npx cap open ios`
5. Set your Team + Bundle ID, then Archive → Distribute

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

### Push Notification System (2025-08-21)
- ✅ Implemented comprehensive PWA push notification system
- ✅ VAPID authentication for secure push messaging
- ✅ Granular notification preferences for users
- ✅ Test notification functionality working
- ✅ Support for activity updates, competition events, team messages, mission tasks, and admin announcements
- ✅ Automatic fallback handling for media file loading
- ✅ Service worker integration for offline PWA capabilities

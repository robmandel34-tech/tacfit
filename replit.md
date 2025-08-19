# TacFit - Fitness Competition Platform

## Overview
TacFit is a full-stack fitness competition platform designed for team-based fitness challenges. It enables users to create and join competitions, form teams, track various activities (Cardio, Strength, Mobility Training, Meditation), and engage through social features like chat and activity feeds. The platform incorporates a reward system for competition winners, activity submissions, and daily mood assessments, and integrates with external services like Strava for automated activity tracking. The vision is to provide a comprehensive wellness platform beyond just fitness, incorporating mental health aspects and fostering community engagement in a tactical-themed environment.

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
- **UI/UX Decisions**:
    - Consistent use of "buddies" instead of "friends" and "Intel Feed" instead of "Activity Feed".
    - Masculine and tactical language ("Command Center", "Tactical Operations", "Mission briefing ready").
    - Redesigned headers and cards with green gradients and consistent styling.
    - Interactive elements like onboarding walkthroughs, progress maps with warrior icons, and intuitive modals.
    - Video-first media display with image gallery overlays.
    - Enhanced chat with emoji and GIF integration.
    - Improved accessibility with proper text contrast and focus states.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **API Design**: RESTful API for managing users, competitions, teams, activities, and social features.
- **File Upload**: Multer for handling evidence uploads.
- **Security**: Admin-only access for critical functions like competition creation, user suspension/deletion, and Intel Feed posts, with privilege verification. Session-based authentication with protected routes.
- **Core Features**:
    - **User Management**: Registration, login, profile customization (pictures, cover photos, motto), user suspension, and deletion.
    - **Competition Management**: Creation, joining, and automatic completion with reward distribution. Includes configurable activity types, target goals, and join windows.
    - **Activity Tracking**: Submission of various activity types with photo evidence, point-based scoring (including bonus points for verified evidence), and Strava integration for automated syncing. Activities are restricted to competition start dates.
    - **Social Features**: Buddy request system (requiring approval), activity feed with likes/comments, team and direct messaging chat, and mission task notification system.
    - **Wellness**: Mood assessment system for daily mental wellness tracking.
    - **Admin Tools**: Comprehensive admin portal for managing competitions, users, activity types, and creating Intel Feed announcements with image support.

### Database Layer
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM for type-safe operations.
- **Schema**: Defined in a shared directory for consistency, managed with Drizzle Kit migrations.

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
- **APIs**: Giphy API (for GIF integration), Google Maps Static API (for Strava route visualization).
- **External Services**: Strava API (for activity syncing and import).

### Development Tools
- **Build**: Vite.
- **TypeScript**: Strict type checking.
- **Linting**: ESLint.
- **Database**: Drizzle Kit.

## Recent Technical Issues Resolved

### Image Loading Issue Resolution (July 2025)
- **FIXED**: Application startup TypeScript compilation errors resolved (65+ errors in profile.tsx)
- **FIXED**: Missing image references in database causing console errors
- **CLEANED**: Removed broken image URLs from activities table (tactical-run-evidence.jpg, missing uploaded files)
- **ENHANCED**: Proper type annotations added for all React Query results
- **RESOLVED**: Database inconsistencies where activities referenced non-existent image files
- **IMPROVED**: Static file serving configuration maintained for proper image/video delivery

### Complete Strava Integration Removal (August 2025)
- **DECISION**: Removed all Strava functionality instead of requesting API limit increase
- **COMPLETED**: Full removal of Strava OAuth, API routes, components, and database fields
- **DATABASE**: Removed stravaAccessToken, stravaRefreshToken, stravaAthleteId, stravaTokenExpiresAt fields
- **BACKEND**: Removed all /api/strava/* routes, OAuth callbacks, and Strava API integrations
- **FRONTEND**: Removed StravaIntegration component, StravaBadge, and all UI references
- **ACTIVITY SYSTEM**: Now operates independently without external API dependencies
- **STATUS**: Application fully functional without Strava integration

### Avatar Display and Deployment Login Fixes (August 2025)
- **FIXED**: Avatar display issues throughout the app by adding proper error handling and fallbacks
- **RESOLVED**: Database references pointing to non-existent image files updated to existing assets
- **ENHANCED**: Error logging system to track which images load successfully vs fail to load
- **ADDRESSED**: Session configuration for Replit deployment by disabling secure cookies requirement
- **UPDATED**: Test user credentials for production deployment (alpha@test.com / test123)
- **STATUS**: Avatars display properly with fallback to user initials, deployment login issues persist

### Email Verification System Implementation (August 2025)
- **IMPLEMENTED**: Comprehensive email verification system for user registration security
- **DATABASE**: Added email verification fields (isEmailVerified, emailVerificationToken, emailVerificationTokenExpiresAt)
- **BACKEND**: Created email service with nodemailer for verification and welcome emails
- **AUTHENTICATION**: Modified registration and login flows to require email verification
- **FRONTEND**: Built email verification page with token handling and user-friendly UI
- **SECURITY**: 24-hour token expiration, secure token generation, and proper error handling
- **USER EXPERIENCE**: Tactical-themed verification emails, resend functionality, and clear status messaging
- **ROUTES**: Added /api/auth/verify-email, /api/auth/resend-verification, and /verify-email page
- **DEVELOPMENT EXCEPTION**: test.com accounts skip email verification for development convenience
- **STATUS**: Complete email verification workflow operational, new users must verify before platform access (except test.com accounts)

### User Deletion Foreign Key Fix (August 2025)
- **ISSUE**: Admin user deletion failing due to foreign key constraints with activities table
- **RESOLUTION**: Updated deleteUser function to cascade delete all related data before removing user
- **AFFECTED TABLES**: activities, mood entries, team memberships, buddy requests, chat messages, phone invitations, activity interactions
- **STATUS**: User deletion now works properly for admin operations
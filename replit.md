# TacFit - Fitness Competition Platform

## Overview

TacFit is a full-stack fitness competition platform built for team-based fitness challenges. The application uses a modern tech stack with React/TypeScript frontend, Express.js backend, and PostgreSQL database with Drizzle ORM. The platform enables users to create and join fitness competitions, form teams, track activities, and interact through chat and social features.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### Masculine Text Language Update (July 2025)
- **UPDATED**: All interface text made more masculine and tactical throughout the app
- **CHANGED**: "Dashboard" → "Command Center" for main page and navigation
- **CHANGED**: "Competitions" → "Operations" or "Tactical Operations" 
- **CHANGED**: "Teams" → "Squad" in navigation and interface
- **CHANGED**: "Activity Feed" → "Intel Feed" in navigation
- **CHANGED**: "Find Friends" → "Locate Allies" in dashboard
- **CHANGED**: "Quick Actions" → "Tactical Commands" section
- **CHANGED**: "Welcome back!" → "Mission briefing ready" on login
- **CHANGED**: "Sign in to your account" → "Access your tactical command center"
- **CHANGED**: "Join TacFit" → "Join the Force" on registration
- **CHANGED**: "Choose a username" → "Choose your callsign" placeholder
- **CHANGED**: "Create Account" → "Join the Force" button text
- **CHANGED**: Activity types renamed: "Cardio" → "Cardio Training", "Strength Training" → "Strength Operations", "Flexibility" → "Mobility Training", "Sports" → "Combat Sports", "Other" → "Special Operations"
- **CHANGED**: "Recent activity" → "Field reports" in dashboard
- **CHANGED**: "Competition in progress" → "Squad deployed | Mission in progress"
- **CHANGED**: "points" → "tactical points" in various contexts
- **CHANGED**: "Max X teams" → "Max X squads" in competition cards
- **CHANGED**: "Required Activities" → "Required Training" in competition details
- **CHANGED**: Error messages updated with tactical language (e.g., "Access denied", "Invalid credentials")
- **ENHANCED**: Bottom navigation updated with tactical terms: "Command", "Operation", "Squad", "Intel"
- **ENHANCED**: Toast notifications and feedback messages use military-inspired language

### UI Text Visibility Fixes (July 2025)
- **FIXED**: Text color visibility issues throughout the application
- **FIXED**: Points display in navigation bar now shows white text instead of black
- **FIXED**: Navigation menu items now use proper light text colors (text-gray-300)
- **FIXED**: Login/register form labels now visible with light gray text
- **FIXED**: Profile icon white rectangle removed from top navigation
- **FIXED**: Activity card like/comment/flag buttons with proper color states
- **FIXED**: Like button now shows green when liked, grey when not liked
- **FIXED**: Flag button shows solid red when flagged and maintains state
- **FIXED**: Comment count updates in real-time when adding comments
- **FIXED**: Activity submission dropdown text color now visible with white text and proper hover states
- **ENHANCED**: All text elements now have proper contrast on dark backgrounds

### Authentication & Navigation Fixes (July 2025)
- **FIXED**: Stale user session authentication bug after database reseeds
- **FIXED**: User session validation now checks if user exists in database
- **FIXED**: Auto-logout for invalid sessions with localStorage cleanup
- **FIXED**: White text visibility issue on login/register forms
- **FIXED**: Navigation after login - now properly redirects to dashboard/home
- **ENHANCED**: Professional styling for login/register forms with better contrast
- **ENHANCED**: Form styling with placeholders, focus states, and modern design
- **ENHANCED**: Authentication system now handles database sync automatically

### Social Features Implementation (July 2025)
- **NEW**: Dynamic user profiles with friend request system
- Clickable profile pictures throughout the app navigate to user profiles
- Friend request functionality with "Send Friend Request" button on other users' profiles
- Friends list modal showing accepted friends with messaging capability
- Direct messaging interface (UI ready, backend to be implemented)
- Profile pictures clickable in activity cards, team member displays, and chat messages
- Dynamic profile URLs support viewing any user's profile via /profile/:userId route
- Friend management with status tracking (pending, accepted, rejected)
- **NEW**: Friend request notification system with approval/denial interface
- **NEW**: Profile customization with uploadable profile pictures and cover photos
- **NEW**: Clickable camera icons on profile and cover photos for easy uploading
- **NEW**: Real-time profile photo updates with loading states and error handling
- **FIXED**: Profile pictures now display throughout the app (navigation, activity cards, chat, team pages)
- **FIXED**: File upload size limit increased to 10MB with proper error handling
- **FIXED**: User context updates immediately when profile pictures are uploaded
- **FIXED**: Competition creation buttons now properly validate user points (1000 required)
- **FIXED**: Profile picture uploads now refresh all cached data to update images everywhere
- **FIXED**: Competition joining is now free for all users (1000 point requirement only applies to creating competitions)
- **NEW**: Interactive team selection modal for joining competitions
- **NEW**: Users can now view all teams, member counts, and open slots before joining
- **NEW**: Dedicated "Join Here" buttons for each open team slot
- **NEW**: Option to create new teams when joining competitions
- **NEW**: Find Friends modal with comprehensive user search functionality
- **NEW**: Search users by username or email with live filtering
- **NEW**: Send friend requests with status tracking (pending, accepted, rejected)
- **NEW**: Accept/reject friend requests with real-time updates
- **NEW**: Display user points and competition history in search results
- **NEW**: Competition-specific activity requirements (3 activity types per competition)
- **NEW**: Team target goals displayed on competition cards (e.g., "100,000 steps as a team")
- **NEW**: Enhanced competition cards show required activities and measurable goals
- **NEW**: Database schema updated to support competition-specific activities and targets
- **UPDATED**: Competition durations shortened to 2-4 weeks for more realistic timeframes
- **UPDATED**: Target goals adjusted proportionally to match shorter competition periods
- **NEW**: Activity submission dropdown filtering - only shows required activities for current competition
- **NEW**: Dynamic activity type filtering based on competition requirements (e.g., Cardio, Strength, Flexibility only)
- **NEW**: Activity measurement indicators showing specific units for each activity type (minutes, reps, etc.)
- **ENHANCED**: Activity submission modal now queries user's team and competition to display relevant activities
- **ENHANCED**: Latest Intel card on dashboard now displays actual user profile pictures instead of colored circles
- **FIXED**: Activity submission dropdown text visibility with proper white text and military green highlighting
- **FIXED**: Auto-navigation to team page after successfully joining a competition and team

### Progress Map Feature (July 2025)
- **NEW**: Added topographical progress map to Competition Status page
- Teams positioned along real Alaska wilderness satellite imagery based on points
- Interactive team markers with ranking colors (gold, silver, bronze, military green)
- Hover tooltips showing team name, points, and motto
- Visual route path with tactical waypoints (Base Camp, ridges, peaks, Victory Point)
- Enhanced team markers with pulse effects for leaders and military-style flags
- Real Alaska wilderness background image from Pixabay (public domain)

### Single Competition/Team Restriction (July 2025)
- **BREAKING CHANGE**: Users can now only be part of one competition + team at a time
- Updated database schema to support single team membership per user
- Modified team joining logic to prevent multiple competition participation
- Enhanced bottom navigation to only show for users with active team membership

### Navigation System Overhaul (July 2025)
- Redesigned bottom navigation with 3 focused tabs: Home, Competition, Team
- Removed Profile tab from bottom nav (accessible via user avatar clicks)
- Added Competition Status page showing team leaderboards and all competition activities
- Updated Team page to display team motto, picture, members, and team-specific activities
- Navigation only appears for users actively participating in competitions

### Team Management Enhancement (July 2025)
- Added team motto and team picture fields to database schema
- Enhanced team display with member avatars, roles, and individual point totals
- Team captain identification with crown icon
- Team-specific activity feed showing only team member submissions
- Improved team member management with user details and points
- **NEW**: Team motto editing functionality for team captains and creators
- **NEW**: Inline motto editing with save/cancel buttons and loading states
- **NEW**: API endpoint for updating team mottos (PATCH /api/teams/:id/motto)
- **NEW**: Permission-based editing - only team captains can edit mottos
- **NEW**: Real-time motto updates with proper error handling and notifications
- **NEW**: Team name editing functionality for team captains and creators
- **NEW**: Inline team name editing with validation and duplicate checking
- **NEW**: API endpoint for updating team names (PATCH /api/teams/:id/name)
- **NEW**: Duplicate team name prevention within the same competition
- **NEW**: Character limits and validation for team names (50 characters max)
- **NEW**: User motto functionality with database schema updates and profile editing interface
- **NEW**: Personal motto editing on user profiles with inline editing UI
- **NEW**: API endpoint for updating user mottos (PATCH /api/users/:id/motto)
- **NEW**: User mottos displayed on team member pages below profile information
- **NEW**: Character limits and validation for user mottos (100 characters max)
- **NEW**: User name editing functionality with inline editing UI
- **NEW**: Real-time name updates with proper cache invalidation
- **NEW**: Enhanced profile page centering for all elements (name, motto, stats, content)
- **NEW**: PATCH endpoint for partial user updates (/api/users/:id PATCH)
- **FIXED**: Activity type badge text color in Latest Intel section now shows gray text instead of black
- **ENHANCED**: Team photo, name, and motto updates now refresh throughout the entire app
- **ENHANCED**: Comprehensive cache invalidation for team changes updates progress map and all team displays
- **ENHANCED**: Progress map now uses high-quality wilderness terrain imagery instead of SVG graphics
- **ENHANCED**: Progress map route path styling improved with better visibility, glowing effects, and drop shadows
- **ENHANCED**: Topographical features enhanced with better contrast and visibility against real terrain background

### Chat System Enhancement (July 2025)
- **NEW**: Added comprehensive emoji and GIF functionality to team chats and direct messages using emoji-picker-react and giphy-api packages
- **NEW**: Enhanced chat interface with emoji picker, GIF search, and proper rendering of multimedia content in messages
- **NEW**: Emoji picker with full emoji selection accessible via smile icon button
- **NEW**: GIF search using Giphy API with thumbnail preview grid and hover effects
- **NEW**: Proper rendering of GIFs in chat messages with fallback error handling
- **NEW**: Enhanced message input with emoji and GIF picker buttons integrated into tactical design theme
- **NEW**: Collapsible team chat card with unread message tracking system
- **NEW**: "Team Comms" title for more tactical, concise branding
- **NEW**: Smart unread message counter that only shows messages not yet viewed (when dropdown opened)
- **NEW**: Automatic message read tracking when chat is expanded
- **NEW**: Messages now display in reverse chronological order with newest messages at the top
- **ENHANCED**: Chat messages now support multimedia content including text, emojis, and animated GIFs
- **ENHANCED**: Chat input interface improved with dedicated buttons for emoji and GIF selection
- **ENHANCED**: GIF search functionality with debounced search input and loading states
- **ENHANCED**: Chat API endpoint properly joins user data with messages to display profile pictures and usernames
- **ENHANCED**: User avatar display in chat messages with fallback to username initials when no profile picture exists
- **ENHANCED**: Team chat now uses collapsible card format instead of always-visible section

### Competition Status Features (July 2025)
- New Competition Status page with comprehensive competition overview
- Team leaderboard with ranking, points, and team mottos
- All competition activities feed with user attribution
- Real-time competition progress tracking
- Enhanced competition header with date ranges and status badges
- **UPDATED**: Cleaner page layout with competition name above map, smaller header text
- **UPDATED**: Leave competition button converted to red icon-only design
- **UPDATED**: Required activities and quantities displayed below date for clear visibility
- **UPDATED**: Removed repetitive competition name from progress map component

### Database Schema Updates (July 2025)
- Added `motto` and `pictureUrl` fields to teams table
- Enhanced API routes for team-specific and competition-specific data retrieval
- New endpoints: `/api/teams/competition/:id`, `/api/team-members/team/:id`, `/api/activities/team/:id`
- **NEW**: Added friendship management endpoints: `/api/friends/:userId`, `/api/friends` (POST), `/api/friends/:id` (PUT)
- **NEW**: Enhanced user profile endpoints to support dynamic user viewing
- **NEW**: Added `coverPhoto` field to users table for profile cover photos
- **NEW**: Added profile photo upload endpoints: `/api/users/:id/avatar`, `/api/users/:id/cover`
- Updated seed data to include team mottos for testing

### UI/UX Improvements (July 2025)
- Updated design with sharper edges and cleaner aesthetic
- Reduced border radius from 0.5rem to 0.125rem for more tactical appearance
- Added military-themed utility classes for consistent styling
- Implemented bottom navigation bar for mobile users
- Added responsive padding to prevent content overlap with bottom nav
- Enhanced CSS with tactical styling utilities (sharp-card, sharp-button, etc.)
- Bottom navigation appears only for users who have joined competitions and teams
- **FIXED**: Profile page icon color visibility issues - all icons now properly colored
- **FIXED**: Activity feed ordering - newest activities now appear at the top
- **FIXED**: Profile page activity/competition counts update in real-time after new submissions
- **FIXED**: Custom military theme colors properly configured in Tailwind for consistent styling

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom military/tactical theme
- **UI Components**: Radix UI primitives with shadcn/ui components
- **State Management**: TanStack Query for server state, React Context for authentication
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and build process

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **File Upload**: Multer for handling activity evidence uploads
- **Error Handling**: Global error middleware with structured responses

### Database Layer
- **Database**: PostgreSQL (configured via Drizzle but flexible)
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Defined in shared directory for type consistency
- **Migrations**: Drizzle Kit for schema management

## Key Components

### Authentication System
- Session-based authentication with user registration/login
- Password storage (currently plain text - needs hashing implementation)
- Protected routes with authentication middleware
- User context provider for frontend state management

### Competition Management
- Create and manage fitness competitions with date ranges
- Team formation with captain/member roles
- Maximum team limits per competition
- Competition status tracking (active/inactive)

### Activity Tracking
- Multiple activity types (cardio, strength, flexibility, sports)
- Photo evidence upload support
- Activity validation and flagging system
- Point-based scoring system

### Social Features
- Activity feed with likes and comments
- Team and competition chat systems
- Friend system for user connections
- Real-time activity updates

### User Interface
- Military/tactical themed design system
- Responsive design for mobile and desktop
- Toast notifications for user feedback
- Modal dialogs for forms and interactions

## Data Flow

### Frontend to Backend
1. User actions trigger React component events
2. TanStack Query handles API calls with caching
3. Authentication context manages user state
4. Toast notifications provide user feedback

### Backend Processing
1. Express middleware handles authentication and validation
2. Drizzle ORM manages database operations
3. File uploads stored in local uploads directory
4. API responses include proper error handling

### Database Operations
1. Drizzle schema definitions ensure type safety
2. Migrations handle schema changes
3. Relationships managed through foreign keys
4. Data validation at both API and database levels

## External Dependencies

### Frontend Dependencies
- **UI Framework**: React, Radix UI, Tailwind CSS
- **State Management**: TanStack Query, React Hook Form
- **Utilities**: date-fns, clsx, class-variance-authority
- **Icons**: Lucide React icons

### Backend Dependencies
- **Web Framework**: Express.js with middleware
- **Database**: Drizzle ORM, @neondatabase/serverless
- **File Handling**: Multer for uploads
- **Development**: tsx for TypeScript execution

### Development Tools
- **Build**: Vite with React plugin
- **TypeScript**: Strict type checking enabled
- **Linting**: ESLint configuration
- **Database**: Drizzle Kit for migrations

## Deployment Strategy

### Development Environment
- Vite development server for frontend
- tsx for backend development with hot reload
- Local PostgreSQL database or Neon serverless
- File uploads stored locally

### Production Build
- Vite builds optimized React bundle
- esbuild bundles backend for Node.js
- Static files served from Express
- Database migrations via Drizzle Kit

### Environment Configuration
- DATABASE_URL environment variable required
- File upload directory created automatically
- Session storage configured for PostgreSQL
- CORS and security middleware configured

### Key Files Structure
```
├── client/          # React frontend
├── server/          # Express backend  
├── shared/          # Shared types and schemas
├── uploads/         # File upload storage
├── migrations/      # Database migrations
└── dist/           # Production build output
```

The application follows a monorepo structure with clear separation between frontend, backend, and shared code, enabling efficient development and deployment workflows.
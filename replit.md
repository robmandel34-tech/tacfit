# TacFit - Fitness Competition Platform

## Overview

TacFit is a full-stack fitness competition platform built for team-based fitness challenges. The application uses a modern tech stack with React/TypeScript frontend, Express.js backend, and PostgreSQL database with Drizzle ORM. The platform enables users to create and join fitness competitions, form teams, track activities, and interact through chat and social features.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

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

### Competition Status Features (July 2025)
- New Competition Status page with comprehensive competition overview
- Team leaderboard with ranking, points, and team mottos
- All competition activities feed with user attribution
- Real-time competition progress tracking
- Enhanced competition header with date ranges and status badges

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
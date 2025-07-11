# TacFit - Fitness Competition Platform

## Overview

TacFit is a full-stack fitness competition platform built for team-based fitness challenges. The application uses a modern tech stack with React/TypeScript frontend, Express.js backend, and PostgreSQL database with Drizzle ORM. The platform enables users to create and join fitness competitions, form teams, track activities, and interact through chat and social features.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

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
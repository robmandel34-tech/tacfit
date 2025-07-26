# TacFit - Fitness Competition Platform

## Overview

TacFit is a full-stack fitness competition platform built for team-based fitness challenges. The application uses a modern tech stack with React/TypeScript frontend, Express.js backend, and PostgreSQL database with Drizzle ORM. The platform enables users to create and join fitness competitions, form teams, track activities, and interact through chat and social features.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### User Interface Text Updates (July 2025)
- **UPDATED**: "Locate Allies" renamed to "Locate Buddies" throughout the application
- **UPDATED**: "Friends" replaced with "Buddies" throughout the entire application
- **CHANGED**: Competition page header button text and replit.md documentation updated
- **CHANGED**: All user-facing text now uses "buddies" instead of "friends"
- **UPDATED**: Modal titles, button text, and help documentation all use buddy terminology
- **CONSISTENT**: All references to finding friends/allies now use "Locate Buddies" terminology
- **FIXED**: Profile cover photo height reduced from h-64 to h-32 for better proportions
- **ADJUSTED**: Profile picture positioning updated to align with shorter cover photo

### Activity Type Display Name Standardization (July 2025)
- **FIXED**: Activity type display names now consistent throughout the entire application
- **UPDATED**: Replaced hardcoded activity type mappings with dynamic database lookups
- **FIXED**: Database activity types updated to match design specifications
- **REMOVED**: Inconsistent "Reading" activity type from database
- **UPDATED**: "Strength Operations" changed back to "Strength Training" for better clarity
- **ADDED**: "Mobility Training" activity type (flexibility) with proper measurement units
- **ENHANCED**: Activity cards, team progress, help pages, and admin portal all use same display names
- **CURRENT**: Three core activity types: Cardio Training (minutes), Strength Training (reps), Mobility Training (minutes)
- **TECHNICAL**: Dynamic activity type fetching ensures consistency when admin updates activity types
- **RESOLVED**: Activity type tags on Intel Feed now show correct display names from database
- **FIXED**: Activity feed page now uses dynamic activity type display names instead of hardcoded raw field names
- **REMOVED**: Point totals from activity cards in the Intel Feed for cleaner UI

### Strava API Integration Implementation (July 2025)
- **NEW**: Complete Strava API integration for automated activity submissions
- **NEW**: OAuth 2.0 authentication flow with secure token management and refresh
- **NEW**: Database schema updated with Strava credentials (access token, refresh token, athlete ID, expiration)
- **NEW**: Automatic activity syncing from Strava with intelligent type mapping (runs→cardio, weightlifting→strength, yoga→flexibility)
- **NEW**: Activity deduplication prevents duplicate entries from manual and Strava submissions
- **NEW**: Strava integration UI component with connection status, sync controls, and disconnect functionality
- **NEW**: Profile page integration - Strava controls only visible on user's own profile for privacy
- **NEW**: 15 base points awarded per synced Strava activity with team point accumulation
- **NEW**: Token refresh handling for expired Strava credentials with automatic re-authentication
- **NEW**: Comprehensive error handling and user feedback for connection issues
- **SECURED**: User must be in active competition to sync activities, preventing point farming
- **ENHANCED**: Activity descriptions include Strava source identification and unique activity IDs
- **INTEGRATED**: Synced activities appear in Intel Feed alongside manually submitted activities

### User Suspension System Implementation (July 2025)
- **NEW**: Complete user suspension functionality for administrative moderation
- **NEW**: Database schema updated with isSuspended, suspendedAt, and suspensionReason fields
- **NEW**: Admin portal suspension controls with reason tracking and status management
- **NEW**: API endpoint for suspending/unsuspending users (POST /api/users/:id/suspend)
- **NEW**: Login protection preventing suspended users from accessing the system
- **NEW**: Suspension status display in admin user management table with status badges
- **NEW**: Suspension modal with optional reason field for documentation and audit trail
- **ENHANCED**: Admins can suspend users with custom reasons and unsuspend when appropriate
- **SECURED**: Suspended users receive clear error message with suspension reason on login attempts
- **TRACKED**: Suspension timestamps and reasons stored for audit trail and transparency

### UI Consistency Updates (July 2025)
- **ENHANCED**: Competitions page header redesigned with green gradient card matching help center style
- **CHANGED**: "Tactical Operations" text updated to "Join a Competition" with description removed
- **STYLED**: "Locate Buddies" button now white with proper contrast and Users icon
- **ENHANCED**: Intel Feed header updated to match green card design with consistent styling
- **CHANGED**: "Activity Feed" renamed to "Intel Feed" throughout interface
- **UPDATED**: Intel Feed description changed to "Live updates from all competitions"
- **STANDARDIZED**: Both main pages now use identical Card component structure with military green theming
- **IMPROVED**: Visual consistency across platform with matching borders, gradients, and typography

### Onboarding Walkthrough System Implementation (July 2025)
- **NEW**: Complete interactive onboarding walkthrough with 6-step guided tour
- **NEW**: Walkthrough covers application features, competition mechanics, team dynamics, activity tracking, and navigation
- **NEW**: Database schema updated with onboardingCompleted field to track user progress
- **NEW**: API endpoint for marking onboarding completion (PATCH /api/users/:id/onboarding)
- **NEW**: Automatic onboarding display for new users who haven't completed the walkthrough
- **NEW**: Help modal in navigation with quick access to tutorial and help topics
- **NEW**: Interactive tutorial can be re-accessed anytime via help center
- **NEW**: Progress tracking with visual indicators and step completion status
- **NEW**: Comprehensive coverage of point system (20 base, 30 with video+image evidence)
- **NEW**: Team formation guidance, competition mechanics, and navigation tutorial
- **ENHANCED**: New user experience now includes guided introduction to all platform features
- **ENHANCED**: Help system provides ongoing support with quick tips and feature explanations

### Profile Competition Participation Display (July 2025)
- **NEW**: Profile pages now show current competition participation status with detailed information
- **NEW**: Active competition section displays competition name, description, team, and user role
- **NEW**: Competition period dates shown with direct link to competition details page
- **NEW**: "Not Currently Participating" state for users without active competition membership
- **NEW**: Personalized messaging for own profile vs viewing other users' profiles
- **NEW**: Quick action buttons - "View Details" for active participants, "Browse Competitions" for non-participants
- **ENHANCED**: Profile pages now provide comprehensive competition engagement overview
- **INTEGRATED**: Seamless navigation from profile to competition status and competition browsing

### Referral Reward System Implementation (July 2025)
- **COMPLETED**: 200-point referral reward system for phone number invitations
- **NEW**: Complete phone invitation tracking database schema with phoneInvitations table
- **NEW**: Team invitation registration page for new users joining via invitation links
- **NEW**: Automatic 200-point distribution when invited users create accounts through referral links
- **NEW**: Dual team invitation system (search existing users OR enter phone numbers)
- **NEW**: Team invitation tokens with expiration and status tracking
- **ENHANCED**: Registration system now handles phone number referrals with proper reward distribution
- **SECURED**: Phone invitation system tracks invitation status and prevents duplicate rewards

### Admin-Only Competition Creation Restriction (July 2025)
- **RESTRICTED**: Regular users can no longer create competitions through the competitions page
- **REMOVED**: Create competition button and functionality from competitions page for all regular users
- **ADMIN-ONLY**: Competition creation now restricted to admin portal only
- **API PROTECTION**: POST /api/competitions endpoint now requires admin privileges
- **UI UPDATES**: Empty state message updated to reflect admin-only creation policy
- **SIMPLIFIED**: Competition page header now only shows "Locate Buddies" button for regular users
- **ENHANCED**: Only administrators can access competition creation, editing, and management features

### Payment UI Contrast & Readability Fixes (July 2025)
- **FIXED**: Payment method selection UI contrast issues - replaced black backgrounds with green border highlights
- **FIXED**: Cancel button text visibility - switched to secondary variant for proper contrast
- **ENHANCED**: Payment method cards now use light green tint backgrounds (bg-military-green/10) when selected
- **ENHANCED**: Green border highlighting instead of dark overlay for selected payment methods
- **ENHANCED**: Improved button styling with white text on green background for primary actions
- **ENHANCED**: Smooth hover transitions and consistent military green color theming
- **IMPROVED**: Better accessibility with proper contrast ratios for all text elements
- **RESOLVED**: White text on white background issue in payment modal buttons

### Dashboard Activity Feed Implementation (July 2025)
- **REDESIGNED**: Home page converted to social activity feed showing all submissions across competitions
- **NEW**: Live activity feed displaying real-time fitness submissions from all users
- **NEW**: Chronological sorting with newest activities appearing first
- **NEW**: Clean, focused layout optimized for activity browsing
- **NEW**: Empty state guidance encouraging users to join competitions and submit activities
- **RESTRICTED**: Flag button removed from home page activity cards (only available within competitions)
- **SIMPLIFIED**: Streamlined design focused on social engagement and motivation
- **ENHANCED**: Central activity discovery replacing complex dashboard widgets
- **IMPROVED**: Social media-style feed promotes community engagement and friendly competition
- **SECURED**: Activity flagging restricted to competition participants only for appropriate moderation context

### Competition Discovery Enhancement (July 2025)
- **NEW**: Competitions with open join windows now appear at top of competition feed
- **NEW**: Visual indicators for active competitions (green ring border and "Join Window Open" badge)
- **NEW**: Dual date ranges showing separate join window and competition dates
- **NEW**: Join window dates displayed with military green styling for emphasis
- **NEW**: Competition dates displayed with steel blue styling for distinction
- **ENHANCED**: Competition sorting prioritizes active competitions before upcoming ones
- **ENHANCED**: Secondary sorting by start date within each group (active vs upcoming)
- **ENHANCED**: Database schema updated with joinStartDate and joinEndDate fields
- **IMPROVED**: Clear visual distinction between joinable and upcoming competitions
- **IMPROVED**: Better information hierarchy with labeled date ranges

### Activity Types Management System (July 2025)
- **NEW**: Complete activity types management system in admin portal
- **NEW**: ActivityType schema with customizable measurement units and default quantities
- **NEW**: CRUD operations for activity types (create, read, update, delete)
- **NEW**: Activity Types tab in admin portal with comprehensive management interface
- **NEW**: Dynamic activity selection in competition creation based on available activity types
- **NEW**: Database seeding with default activity types (cardio, strength, flexibility)
- **NEW**: Activity description field for providing guidance to users during activity submission
- **FIXED**: Competition creation form now properly shows "Create New Competition" vs "Edit Competition"
- **FIXED**: Competition form no longer uses hardcoded activity types - now uses dynamic database-driven selection
- **ENHANCED**: Admin can create custom activity types with specific measurement units (minutes, reps, sets, miles, etc.)
- **ENHANCED**: Competition creation form dynamically adapts to available activity types
- **ENHANCED**: Activity types can be enabled/disabled to control availability in competitions
- **ENHANCED**: Default quantity values help with consistent goal setting across competitions
- **ENHANCED**: Activity submission modal displays helpful descriptions when selecting activity types

### Complete Strava Activity Types Integration (July 2025)
- **NEW**: Added all 44 official Strava activity types to admin portal
- **NEW**: Comprehensive activity type coverage: Running (6 types), Cycling (8 types), Water Sports (9 types), Winter Sports (7 types), Indoor/Gym (6 types), Other Sports (8 types)
- **NEW**: Enhanced Strava activity mapping with direct type-to-type correspondence instead of generic cardio/strength/flexibility categories
- **NEW**: Intelligent measurement unit mapping (minutes for cardio activities, reps for strength activities)
- **NEW**: Activity types include: Run, Trail Run, Virtual Run, Walk, Hike, Wheelchair, Ride, Mountain Bike Ride, Gravel Ride, E-Bike Ride, Swim, Canoe, Kayak, Rowing, Alpine Ski, Snowboard, CrossFit, Weight Training, Yoga, Tennis, Golf, and many more
- **ENHANCED**: Strava sync now preserves specific activity types (e.g., Trail Run stays as Trail Run instead of generic Cardio)
- **ENHANCED**: Better activity classification for competitions and team tracking
- **ENHANCED**: More accurate point allocation based on specific activity types
- **COMPREHENSIVE**: System now supports every official Strava activity type with proper categorization and measurement units

### Meditation & Mindfulness Integration (July 2025)
- **NEW**: Added 6 comprehensive meditation activity types: Meditation, Mindfulness, Breathing Exercises, Sleep Meditation, Body Scan, Loving Kindness
- **NEW**: Meditation activity types optimized for Terra API integration to capture data from popular apps (Headspace, Calm, Insight Timer)
- **NEW**: Proper measurement units (minutes) and realistic default quantities for meditation sessions
- **READY**: Platform prepared for meditation app integration through Terra API's HealthKit/Google Fit connections
- **STRATEGY**: Indirect integration approach since major meditation apps (Headspace, Calm, Insight Timer) don't offer public APIs
- **HOLISTIC**: Expanded platform from pure fitness to comprehensive wellness including mental health and mindfulness tracking

### Strava Activity Import System (July 2025)
- **NEW**: Manual Strava activity import functionality in activity submission modal
- **NEW**: "Import from Strava" section with recent activities display (last 7 days)
- **NEW**: Real-time Strava activity fetching with activity type mapping and quantity calculation
- **NEW**: Activity selection interface showing activity name, type, duration, distance, and mapped TacFit type
- **NEW**: Automatic form population when Strava activity is selected (type, description, quantity)
- **NEW**: API endpoint `/api/strava/recent-activities` for fetching mappable activities
- **NEW**: Enhanced activity submission to handle Strava activity IDs with proper identification
- **NEW**: Strava import tracking in activity descriptions with unique activity ID references
- **ENHANCED**: Activity submission modal now includes orange-themed Strava integration section
- **ENHANCED**: Comprehensive activity type mapping covering all 44 Strava activity types plus meditation
- **INTEGRATED**: Seamless workflow allowing users to select recent Strava activities during manual submission

### Mission Planning Board Updates (July 2025)
- **RESTORED**: Mission Planning Board brought back with collapsible format matching Team Comms card
- **ENHANCED**: Added proper Card wrapper with header structure and collapsible trigger
- **INTEGRATED**: Collapsible component with CardHeader as trigger for consistent tactical theme
- **STYLED**: Added Clipboard icon and consistent styling with tactical theme colors
- **POSITIONED**: "Add Task" button aligned to left side for better visual flow
- **SECURED**: Task completion restricted to assigned user OR team captain only
- **PERMISSION**: Added authentication checks to prevent unauthorized task completion
- **DISABLED**: Checkbox becomes disabled for users without task completion permissions
- **VISUAL**: Added visual indicators (opacity, cursor) for disabled task completion states

### Profile Activity Statistics Implementation (July 2025)
- **NEW**: Real-time activity, competition, and wins counting on profile pages
- **NEW**: Clickable statistics cards that open detailed modal lists
- **NEW**: Activities modal shows all user submissions with points, dates, and details
- **NEW**: Competitions modal displays participation history with team info and rankings
- **NEW**: Wins modal highlights 1st place finishes with special trophy styling
- **FIXED**: Activity submission cache invalidation now updates profile statistics immediately
- **NEW**: Points display on activity submission modal showing base points (20) and bonus (+10 for dual evidence)
- **NEW**: Competition name displayed on activity cards throughout the application  
- **NEW**: Points badge shown on activity cards for easy tracking
- **ENHANCED**: Activity submission modal includes live points calculator with total display
- **ENHANCED**: All activity API endpoints now include competition and points information
- **ENHANCED**: Profile statistics use authentic data from API endpoints
- **ENHANCED**: Modal interfaces provide comprehensive activity and competition history
- **CALCULATED**: Wins automatically calculated from competition rankings (finalRank === 1)

### Activity Measurement Standardization (July 2025)
- **STANDARDIZED**: All competitions now use the same three activity types: Cardio, Strength, Flexibility
- **UNIFIED**: Activity measurements consistent across all areas: Cardio = minutes, Strength = reps, Flexibility = minutes
- **ENHANCED**: Activity submission form shows measurement unit clearly above quantity field
- **RESTRICTED**: Quantity field now only accepts numeric input (type="number")
- **DISABLED**: Quantity field disabled until user selects activity type
- **UPDATED**: Target goals in competitions use consistent units (e.g., "1,500 minutes of cardio")
- **CLEANED**: Removed inconsistent activity types (sports, other) to focus on core three
- **IMPROVED**: Activity cards and progress tracking use same measurement units throughout

### Competition Reward System (July 2025)
- **NEW**: Automated competition completion and point distribution system
- **REWARDS**: 1st place - Team captain gets 1000 points, members get 500 points
- **REWARDS**: 2nd place - Team captain gets 500 points, members get 250 points
- **AUTOMATIC**: Competitions automatically completed when end date passes
- **TRACKING**: Database schema updated with isCompleted and completedAt fields
- **ADMIN**: Admin portal includes "Complete Competition" button for manual completion
- **LOGGING**: Server logs all point awards and completion status for audit trail
- **RANKING**: Teams ranked by total points with proper tie-breaking logic

### Join Window End Date Fix (July 2025)
- **FIXED**: Join windows now properly close at end of day (23:59:59.999) instead of beginning of day
- **CORRECTED**: Competition join windows remain open until 1 second after midnight on the end date
- **FIXED**: Completed competitions are now properly marked as closed and non-joinable regardless of join window dates
- **UPDATED**: Both frontend (competitions page) and backend (API validation) use consistent end-of-day logic
- **VALIDATED**: Database query confirms proper join window status calculation with completion status
- **PREVENTED**: Users can no longer join completed competitions through either join team or create team endpoints
- **FILTERED**: Competitions with closed join windows are now completely hidden from competitions page
- **UPDATED**: Empty state message updated to reflect that only competitions with open join windows are displayed

### Points System Update (July 2025)
- **UPDATED**: Base activity points adjusted from 20 to 15 points per submission
- **MAINTAINED**: Dual evidence (video + image) bonus remains at 30 points total
- **CALCULATION**: Base points (15) + bonus (+15) = 30 points total for dual evidence submissions
- **VISUAL**: Activity submission modal shows updated point values (15 base, +15 bonus)
- **UPDATED**: All help pages and onboarding walkthrough reflect new point values
- **TACTICAL**: Help center renamed from "TacFit Help Center" to "Tactical Command Center"
- **CONSISTENT**: Point descriptions updated across all help sections and modal components
- **INCENTIVE**: Tooltip encourages users to submit both evidence types for maximum points
- **LOGGING**: Server logs bonus point awards for tracking and debugging
- **AUTOMATIC**: Bonus calculation applied server-side during activity submission processing

### Competition Status Display Enhancement (July 2025)
- **ENHANCED**: Competition tab now shows "starts in # days" for competitions that haven't started yet but can be joined
- **IMPROVED**: Time display logic differentiates between pre-start (starts in X days) and active (X days left) competitions
- **FIXED**: Competition status display now properly handles competition start dates vs end dates
- **USER-FRIENDLY**: Clearer messaging helps users understand when competitions begin vs when they end

### Activity Submission Pre-Competition Restrictions (July 2025)
- **NEW**: Backend validation prevents activity submissions before competition start date
- **NEW**: Frontend activity submission modal displays warning when competition hasn't started
- **NEW**: All form fields disabled until competition begins (activity type, description, quantity, file uploads)
- **NEW**: Strava integration section disabled before competition starts
- **NEW**: Submit button shows "Competition Not Started" and is disabled appropriately
- **ENHANCED**: Clear messaging shows competition start date and days remaining until start
- **SECURED**: Teams cannot make progress or earn points before their competition officially begins
- **USER-FRIENDLY**: Visual indicators and disabled states prevent user confusion about submission timing

### Admin Portal Implementation (July 2025)
- **NEW**: Complete admin portal for competition creation and management
- **ACCESS**: Admin users can access portal via /admin route in main navigation
- **PERMISSIONS**: Admin status stored in database with isAdmin boolean field
- **COMPETITION MANAGEMENT**: Create, edit, and delete competitions with full form validation
- **USER MANAGEMENT**: View all users and toggle admin status (except own status)
- **SETTINGS**: Settings panel placeholder for future system configuration
- **SECURITY**: Admin-only routes protected with authentication checks
- **INTERFACE**: Clean tabbed interface for managing competitions, users, and settings
- **BYPASS**: Admin users can create competitions without 1000 point requirement
- **SEEDED**: Sample admin user (Alpha) created with admin privileges for testing
- **ENHANCED**: Competition form includes activity selection and target goal configuration
- **ACTIVITY SELECTION**: Checkbox interface for selecting required activities (Cardio, Strength, Flexibility)
- **TARGET GOALS**: Dynamic input fields for setting quantitative goals per selected activity
- **VALIDATION**: Form validation ensures at least one activity is selected before submission
- **UNITS**: Proper unit handling (minutes for cardio/flexibility, reps for strength)
- **DEFAULTS**: Smart default values when activities are selected (1500 cardio, 5000 strength, 1000 flexibility)
- **FIXED**: API request parameter order corrected for all admin mutations
- **FIXED**: MaxTeams input field now allows proper editing without NaN errors
- **FIXED**: Scrollable modal with proper overflow handling for long forms
- **FIXED**: Date conversion error in competition updates - backend now properly handles date string to Date object conversion

### Masculine Text Language Update (July 2025)
- **UPDATED**: All interface text made more masculine and tactical throughout the app
- **CHANGED**: "Dashboard" → "Command Center" for main page and navigation
- **CHANGED**: "Competitions" → "Operations" or "Tactical Operations" 
- **CHANGED**: Navigation updated to use "Team" terminology
- **CHANGED**: "Activity Feed" → "Intel Feed" in navigation
- **CHANGED**: "Find Friends" → "Find Buddies" in dashboard
- **CHANGED**: "Quick Actions" → "Tactical Commands" section
- **CHANGED**: "Welcome back!" → "Mission briefing ready" on login
- **CHANGED**: "Sign in to your account" → "Access your tactical command center"
- **CHANGED**: "Join TacFit" → "Join the Force" on registration
- **CHANGED**: "Choose a username" → "Choose your callsign" placeholder
- **CHANGED**: "Create Account" → "Join the Force" button text
- **CHANGED**: Activity types renamed: "Cardio" → "Cardio Training", "Strength Training" → "Strength Operations", "Flexibility" → "Mobility Training", "Sports" → "Combat Sports", "Other" → "Special Operations"
- **CHANGED**: "Recent activity" → "Field reports" in dashboard
- **CHANGED**: "Competition in progress" → "Team deployed | Mission in progress"
- **CHANGED**: "points" → "tactical points" in various contexts
- **CHANGED**: "Max X teams" → "Max X teams" in competition cards
- **CHANGED**: "Required Activities" → "Required Training" in competition details
- **CHANGED**: Error messages updated with tactical language (e.g., "Access denied", "Invalid credentials")
- **ENHANCED**: Bottom navigation updated with terms: "Home", "Competitions", "Team"
- **ENHANCED**: Team tab now stays visible but greyed out when user hasn't joined a competition
- **REVERTED**: "Operations" navigation item renamed back to "Competitions" in both desktop and mobile navigation
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
- **NEW**: Dynamic user profiles with buddy request system
- Clickable profile pictures throughout the app navigate to user profiles
- Buddy request functionality with "Send Buddy Request" button on other users' profiles
- Buddies list modal showing accepted buddies with messaging capability
- Direct messaging interface (UI ready, backend to be implemented)
- Profile pictures clickable in activity cards, team member displays, and chat messages
- Dynamic profile URLs support viewing any user's profile via /profile/:userId route
- Friend management with status tracking (pending, accepted, rejected)
- **NEW**: Buddy request notification system with approval/denial interface
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
- **NEW**: Find Buddies modal with comprehensive user search functionality
- **NEW**: Search users by username or email with live filtering
- **NEW**: Send buddy requests with status tracking (pending, accepted, rejected)
- **NEW**: Accept/reject buddy requests with real-time updates
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
- Hover tooltips showing team name, progress percentage, and motto
- Visual route path with tactical waypoints (Base Camp, ridges, peaks, Victory Point)
- Enhanced team markers with pulse effects for leaders and military-style flags
- Real Alaska wilderness background image from Pixabay (public domain)
- **UPDATED**: Team progress map shows percentages instead of raw points for cleaner competition view

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
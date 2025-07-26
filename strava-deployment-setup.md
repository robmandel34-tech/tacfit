# Strava Integration Setup for Deployed Apps

## Problem
When you deploy your TacFit app to a new domain (like Replit's deployment domains), Strava connections fail with "Bad Request - invalid redirect_uri" because Strava requires pre-configured redirect URIs.

## Solution

### Step 1: Get Your Deployed App Domain
When you deploy your app, note the domain. For example:
- Replit deployment: `https://your-app-name.your-username.replit.app`
- Custom domain: `https://yourdomain.com`

### Step 2: Update Strava App Settings
1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Find your "TacFit" application
3. Click "Edit" 
4. In the "Authorization Callback Domain" field, add your deployed domain:
   ```
   your-app-name.your-username.replit.app
   ```
   **Important:** Only add the domain part, not the full URL with `/callback`

### Step 3: Test the Connection
1. Go to your deployed app
2. Register a new user or login
3. Go to Profile page
4. Click "Connect with Strava"
5. Should redirect to Strava authorization successfully

## Current Configuration
The app is currently configured for:
- Development: `52c3692b-e3ae-4f26-87b1-b5a765544cd7-00-3bw69stdxgu5x.worf.replit.dev`
- Deployed apps: Automatically detects domain but requires Strava app configuration

## Technical Details
- The app automatically detects if it's running on a `.replit.app` domain
- For production deployments, it uses the current domain
- For development, it falls back to the original configured domain
- Users can connect Strava regardless of competition membership

## Troubleshooting
If you still get "invalid redirect_uri" errors:
1. Double-check the domain in Strava app settings matches exactly
2. Make sure you're not including `https://` or `/callback` in the domain field
3. Wait a few minutes after updating Strava settings for changes to take effect
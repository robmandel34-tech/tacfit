# Strava Connection Fix Instructions

## Current Issue
The Strava app redirect URI doesn't match your current domain, causing "Bad Request" errors.

## Your Current Domain
`52c3692b-e3ae-4f26-87b1-b5a765544cd7-00-3bw69stdxgu5x.worf.replit.dev`

## Required Redirect URI
`https://52c3692b-e3ae-4f26-87b1-b5a765544cd7-00-3bw69stdxgu5x.worf.replit.dev/callback`

## Steps to Fix

1. **Go to Strava Developers:** https://www.strava.com/settings/api
2. **Find your TacFit app** (App ID: 89938)
3. **Update the Authorization Callback Domain to:**
   ```
   52c3692b-e3ae-4f26-87b1-b5a765544cd7-00-3bw69stdxgu5x.worf.replit.dev
   ```
4. **Save the changes**
5. **Try connecting again in TacFit**

## Alternative Quick Fix
If you want to test without updating Strava settings, I can temporarily disable Strava integration until the domain is configured properly.

## Current App Details
- Client ID: 89938
- Redirect URI needed: `https://52c3692b-e3ae-4f26-87b1-b5a765544cd7-00-3bw69stdxgu5x.worf.replit.dev/callback`
- Scopes: `read,activity:read_all`
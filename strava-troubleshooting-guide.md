# Strava Integration Troubleshooting Guide

## Quick Diagnosis

Use these endpoints to quickly diagnose Strava connection issues:

1. **Health Check**: `/api/strava/health-check` - Check overall system configuration
2. **User Diagnostics**: `/api/debug/strava-troubleshoot/{userId}` - Detailed user-specific troubleshooting

## Common Issues and Solutions

### 1. Domain Configuration Error
**Symptoms:**
- Error: "domain_not_configured" or "Bad Request - invalid redirect_uri"
- Users can't complete Strava authorization

**Cause:**
Your app's domain is not configured in Strava app settings.

**Solution:**
1. Go to [Strava API Settings](https://www.strava.com/settings/api)
2. Edit your Strava application
3. Add your domain to "Authorization Callback Domains"
   - For development: `your-repl-domain.replit.dev`
   - For deployed apps: `your-app-name.replit.app`
4. Click "Update Application"

### 2. Environment Variables Missing
**Symptoms:**
- Error: "Strava client ID not configured"
- Connection fails immediately

**Required Environment Variables:**
```bash
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
REPLIT_DOMAINS=your-app-name.replit.app  # For deployed apps only
```

**How to Set:**
1. Go to your Replit project
2. Click "Secrets" (lock icon in sidebar)
3. Add each environment variable
4. Restart your application

### 3. Token Expiration
**Symptoms:**
- Previously connected users get "authorization_expired" errors
- API calls return 401 Unauthorized

**Solution:**
Users need to reconnect their Strava accounts. The system should automatically handle token refresh, but if it fails, users must re-authorize.

### 4. Development vs Production Domains
**Problem:**
App works in development but fails when deployed.

**Solution:**
1. Set `REPLIT_DOMAINS` environment variable to your deployed domain
2. Update Strava app settings with deployed domain
3. Test authorization flow on deployed app

### 5. Connection Hangs or Times Out
**Symptoms:**
- Users click "Connect to Strava" but nothing happens
- Authorization page doesn't load

**Debugging Steps:**
1. Check browser console for errors
2. Verify STRAVA_CLIENT_ID is correct
3. Test health check endpoint
4. Check if Strava API is accessible from your environment

## Testing Your Configuration

### Manual Testing Steps:
1. Visit `/api/strava/health-check` to verify environment setup
2. Try connecting a test user account
3. Check console logs for detailed error information
4. Use troubleshooting endpoint for specific users: `/api/debug/strava-troubleshoot/{userId}`

### Automated Testing:
The system includes comprehensive logging. Check server logs for:
- Domain detection results
- Token exchange details
- API response codes
- Error messages

## Best Practices

1. **Always set REPLIT_DOMAINS** for deployed applications
2. **Test in both development and production** environments
3. **Monitor token expiration** and handle refresh gracefully
4. **Provide clear error messages** to users
5. **Keep Strava app settings updated** when domains change

## Getting Help

If you're still experiencing issues:
1. Check the health check endpoint output
2. Review server console logs
3. Verify all environment variables are set correctly
4. Ensure Strava app settings match your domain configuration
5. Test with the troubleshooting endpoints provided

The system includes extensive debugging capabilities to help identify and resolve connection issues quickly.
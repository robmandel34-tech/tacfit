# Strava Athlete Limit Increase Guide for TacFit

## Current Situation
- Your TacFit app has reached its Strava athlete connection limit
- Currently 3 users are connected, but new users can't connect
- This is due to Strava's "Single Player Mode" or low athlete capacity limits

## What is Single Player Mode?
- All new Strava API applications start with a **1-athlete connection limit**
- Designed to allow developers to test with their own data only
- Must be manually increased by Strava after app review

## How to Request Increased Athlete Capacity

### Step 1: Prepare Your Application
Before submitting the request, ensure your app meets Strava's requirements:

#### Required Information:
- **App Name**: TacFit
- **App Description**: Team-based fitness competition platform with military/tactical theme
- **Use Case**: Users connect Strava to automatically sync fitness activities for team competitions
- **Current Users**: 3 connected athletes
- **Requested Capacity**: 999 athletes (standard approved limit)

#### Brand Compliance:
- ✅ Strava branding properly implemented
- ✅ "Connect with Strava" button uses official design
- ✅ Strava data attribution included
- ✅ Privacy policy covers Strava data usage

### Step 2: Submit Developer Program Application

#### Method 1: Strava Developer Program Form
1. Visit: https://developers.strava.com/
2. Look for "Developer Program" or "Request Review" section
3. Fill out the application form with your app details

#### Method 2: Direct Email
If the form is not available, email directly:
- **Email**: developers@strava.com
- **Subject**: "Athlete Capacity Increase Request - TacFit App"

### Step 3: Email Template

```
Subject: Athlete Capacity Increase Request - TacFit App

Dear Strava Developer Team,

I am requesting an increase in athlete capacity for my fitness application "TacFit".

App Details:
- App Name: TacFit
- Client ID: [Your Strava Client ID]
- App URL: [Your production URL]
- Current Athlete Limit: [Current limit, likely 1 or 3]
- Requested Limit: 999 athletes

App Description:
TacFit is a team-based fitness competition platform designed for military and tactical fitness enthusiasts. Users form teams and compete in various fitness challenges including cardio, strength training, mobility work, and meditation.

Strava Integration Purpose:
- Users voluntarily connect their Strava accounts to automatically sync fitness activities
- Activities are imported to score points for team competitions
- Provides seamless experience for users who already track workouts on Strava
- Reduces manual data entry and improves competition accuracy

Technical Implementation:
- OAuth 2.0 authentication flow properly implemented
- Token refresh handling for long-term access
- Efficient API usage with proper rate limiting respect
- Strava branding guidelines followed

Current Usage:
- 3 athletes currently connected
- Approaching current capacity limit
- Additional users unable to connect (receiving limit error)

Compliance:
- Privacy policy covers Strava data usage
- Official Strava branding implemented
- Data retention policies in place
- No data misuse or violation of terms

I believe TacFit provides value to the Strava community by encouraging fitness through team competition and making Strava data more engaging for users.

Please let me know if you need any additional information or documentation.

Thank you for your consideration.

Best regards,
[Your Name]
[Your Email]
[Company/Organization if applicable]
```

### Step 4: Documentation to Include

Prepare these items to support your request:

1. **Screenshots showing**:
   - Your app's Strava integration
   - Proper Strava branding
   - User consent flow

2. **Technical Documentation**:
   - OAuth implementation details
   - Rate limiting respect
   - Error handling

3. **Privacy Policy** covering:
   - Strava data usage
   - Data retention policies
   - User consent

### Step 5: Expected Timeline

- **Response Time**: 2-4 weeks (can vary significantly)
- **Review Process**: Strava manually reviews each application
- **Approval**: Not guaranteed - must meet their guidelines
- **Follow-up**: You can email for status updates after 2 weeks

## Alternative Solutions (Temporary)

While waiting for approval, you can:

1. **Rotate Test Accounts**: Disconnect inactive users to make room
2. **Priority User List**: Manually manage which users get Strava access
3. **Manual Entry**: Allow users to manually enter activities temporarily

## After Approval

Once approved, you'll typically receive:
- **Athlete Capacity**: Up to 999 athletes
- **Maintained Rate Limits**: Usually no change to API rate limits
- **Production Ready**: Full access for public use

## Important Notes

- **Response Time Varies**: Can take weeks or even months
- **Not Guaranteed**: Strava can reject applications
- **Follow Guidelines**: Strict adherence to brand and usage guidelines required
- **One Request**: Submit one well-prepared request rather than multiple

## Monitoring Current Usage

To track your current athlete connections:
- Check your database: Currently 3 users with `strava_access_token`
- Monitor connection attempts for limit errors
- Use Strava's API headers to track usage

## Contact Information

- **Strava Developer Support**: developers@strava.com
- **Community Hub**: https://communityhub.strava.com/developers-api-7
- **Documentation**: https://developers.strava.com/docs/

---

**Next Steps**: Prepare and submit your athlete capacity increase request to Strava following the guidelines above.
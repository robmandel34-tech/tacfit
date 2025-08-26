# TacFit Data Sync API

This API allows your external website to sync user points data from TacFit for use as credits/currency.

## Setup

### 1. Environment Variables
Add these environment variables to your TacFit deployment:

```bash
# Required: API key for securing sync endpoints
SYNC_API_KEY=your_secure_api_key_here

# Optional: Webhook URL for real-time notifications
EXTERNAL_WEBHOOK_URL=https://your-website.com/webhook/tacfit-points

# Optional: Webhook signature secret
WEBHOOK_SECRET=your_webhook_secret
```

### 2. Authentication
All sync endpoints require an API key in the headers:
```
X-API-Key: your_secure_api_key_here
```

## API Endpoints

### Health Check
```
GET /api/sync/health
```
Check if the sync API is working.

**Response:**
```json
{
  "status": "healthy",
  "service": "TacFit Data Sync API",
  "timestamp": "2025-01-26T18:00:00.000Z",
  "version": "1.0.0"
}
```

### Get All Users Points (Bulk Sync)
```
GET /api/sync/users-points
Headers: X-API-Key: your_api_key
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-01-26T18:00:00.000Z",
  "count": 150,
  "users": [
    {
      "id": 1,
      "username": "Alpha",
      "email": "alpha@test.com",
      "points": 1250,
      "lastUpdated": "2025-01-26T18:00:00.000Z"
    },
    {
      "id": 2,
      "username": "Bravo",
      "email": "bravo@test.com", 
      "points": 890,
      "lastUpdated": "2025-01-26T18:00:00.000Z"
    }
  ]
}
```

### Get Specific User Points by ID
```
GET /api/sync/user/{userId}/points
Headers: X-API-Key: your_api_key
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "Alpha",
    "email": "alpha@test.com",
    "points": 1250,
    "lastUpdated": "2025-01-26T18:00:00.000Z"
  }
}
```

### Get User Points by Username
```
GET /api/sync/user-by-username/{username}/points
Headers: X-API-Key: your_api_key
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "Alpha",
    "email": "alpha@test.com",
    "points": 1250,
    "lastUpdated": "2025-01-26T18:00:00.000Z"
  }
}
```

## Real-Time Webhooks

### Register Your Webhook
```
POST /api/sync/register-webhook
Headers: X-API-Key: your_api_key
Content-Type: application/json

{
  "webhook_url": "https://your-website.com/webhook/tacfit-points"
}
```

### Webhook Payload
When points are updated, your webhook will receive:

```json
{
  "event": "points_updated",
  "data": {
    "userId": 1,
    "username": "Alpha",
    "email": "alpha@test.com",
    "previousPoints": 1200,
    "newPoints": 1250,
    "pointsChange": 50,
    "reason": "Activity submission",
    "timestamp": "2025-01-26T18:00:00.000Z"
  }
}
```

**Webhook Headers:**
- `Content-Type: application/json`
- `X-Webhook-Source: TacFit-Points-Sync`
- `X-Webhook-Signature: sha256_hash` (if WEBHOOK_SECRET is set)

## Points Earning Events

Users earn points through these activities:
- **Activity Submissions**: 15-30 points (based on evidence quality)
- **Daily Mood Logs**: 5 points
- **Successful Referrals**: 200 points (awarded to referrer)
- **Competition Completion**: Variable points (based on placement)

## Example Integration Code

### PHP Example
```php
<?php
// Fetch all users points
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://your-tacfit.repl.co/api/sync/users-points");
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'X-API-Key: your_secure_api_key_here'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);

if ($data['success']) {
    foreach ($data['users'] as $user) {
        // Update your database with user points as credits
        updateUserCredits($user['id'], $user['points']);
    }
}
?>
```

### Python Example
```python
import requests

headers = {
    'X-API-Key': 'your_secure_api_key_here'
}

response = requests.get(
    'https://your-tacfit.repl.co/api/sync/users-points',
    headers=headers
)

if response.status_code == 200:
    data = response.json()
    if data['success']:
        for user in data['users']:
            # Update your database with user points as credits
            update_user_credits(user['id'], user['points'])
```

### Node.js Webhook Handler
```javascript
app.post('/webhook/tacfit-points', express.json(), (req, res) => {
    const { event, data } = req.body;
    
    if (event === 'points_updated') {
        // Update user credits in your database
        updateUserCredits(data.userId, data.newPoints);
        console.log(`Updated ${data.username} credits to ${data.newPoints}`);
    }
    
    res.status(200).json({ received: true });
});
```

## Security Notes

1. **Keep your API key secure** - Don't expose it in client-side code
2. **Verify webhook signatures** if using WEBHOOK_SECRET
3. **Use HTTPS** for all API calls
4. **Rate limit** your sync requests appropriately
5. **Store credentials securely** in environment variables

## Sync Strategies

### Option 1: Periodic Bulk Sync
- Call `/api/sync/users-points` every hour/day
- Update all user credits in your database
- Simple but less real-time

### Option 2: Real-Time Webhooks
- Set up webhook endpoint on your website
- Register webhook with `/api/sync/register-webhook`
- Receive instant updates when points change
- More complex but real-time

### Option 3: On-Demand Sync
- Sync individual users when they visit your website
- Call `/api/sync/user/{userId}/points` as needed
- Good for hybrid approach

## Error Handling

All endpoints return standard HTTP status codes:
- `200`: Success
- `401`: Invalid or missing API key
- `404`: User/resource not found
- `500`: Server error

Error responses include a message:
```json
{
  "message": "Invalid API key"
}
```

## Support

For integration support or questions, contact the TacFit development team.
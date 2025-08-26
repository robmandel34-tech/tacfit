#!/usr/bin/env node

// Example script showing how to sync TacFit user points to an external website
// This demonstrates the three main integration approaches

const API_KEY = process.env.SYNC_API_KEY || 'your-api-key-here';
const TACFIT_BASE_URL = process.env.TACFIT_URL || 'https://your-tacfit.repl.co';

// Helper function to make API calls
async function tacfitAPI(endpoint) {
  try {
    const response = await fetch(`${TACFIT_BASE_URL}${endpoint}`, {
      headers: {
        'X-API-Key': API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch ${endpoint}:`, error.message);
    throw error;
  }
}

// Approach 1: Bulk sync all users
async function bulkSyncAllUsers() {
  console.log('\n=== BULK SYNC: All Users ===');
  
  try {
    const data = await tacfitAPI('/api/sync/users-points');
    
    console.log(`✓ Fetched ${data.count} users at ${data.timestamp}`);
    console.log('\nTop users by points:');
    
    // Sort by points descending and show top 5
    const topUsers = data.users
      .sort((a, b) => b.points - a.points)
      .slice(0, 5);
    
    topUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username}: ${user.points} points`);
      
      // Here you would update your database:
      // await updateUserCreditsInDatabase(user.id, user.points);
    });
    
    return data.users;
    
  } catch (error) {
    console.error('Bulk sync failed:', error.message);
    throw error;
  }
}

// Approach 2: Sync individual user by ID
async function syncUserById(userId) {
  console.log(`\n=== INDIVIDUAL SYNC: User ID ${userId} ===`);
  
  try {
    const data = await tacfitAPI(`/api/sync/user/${userId}/points`);
    const user = data.user;
    
    console.log(`✓ User: ${user.username} (${user.email})`);
    console.log(`✓ Points: ${user.points}`);
    console.log(`✓ Last Updated: ${user.lastUpdated}`);
    
    // Here you would update your database:
    // await updateUserCreditsInDatabase(user.id, user.points);
    
    return user;
    
  } catch (error) {
    console.error(`Individual sync failed for user ${userId}:`, error.message);
    throw error;
  }
}

// Approach 3: Sync user by username
async function syncUserByUsername(username) {
  console.log(`\n=== USERNAME SYNC: ${username} ===`);
  
  try {
    const data = await tacfitAPI(`/api/sync/user-by-username/${username}/points`);
    const user = data.user;
    
    console.log(`✓ User ID: ${user.id}`);
    console.log(`✓ Email: ${user.email}`);
    console.log(`✓ Points: ${user.points}`);
    
    return user;
    
  } catch (error) {
    console.error(`Username sync failed for ${username}:`, error.message);
    throw error;
  }
}

// Example webhook handler (for Express.js)
function setupWebhookHandler(app) {
  app.use(express.json());
  
  app.post('/webhook/tacfit-points', (req, res) => {
    const { event, data } = req.body;
    
    console.log(`\n=== WEBHOOK RECEIVED: ${event} ===`);
    
    if (event === 'points_updated') {
      console.log(`User: ${data.username} (ID: ${data.userId})`);
      console.log(`Points: ${data.previousPoints} → ${data.newPoints} (${data.pointsChange > 0 ? '+' : ''}${data.pointsChange})`);
      console.log(`Reason: ${data.reason}`);
      console.log(`Time: ${data.timestamp}`);
      
      // Update your database in real-time:
      // await updateUserCreditsInDatabase(data.userId, data.newPoints);
      
      res.status(200).json({ received: true });
    } else {
      res.status(400).json({ error: 'Unknown event type' });
    }
  });
  
  console.log('Webhook handler set up at POST /webhook/tacfit-points');
}

// Example database update function (pseudo-code)
async function updateUserCreditsInDatabase(userId, points) {
  // This is where you'd update your external website's database
  console.log(`[DATABASE] Updating user ${userId} credits to ${points}`);
  
  // Example SQL (adjust for your database):
  // await db.query('UPDATE users SET credits = ? WHERE tacfit_user_id = ?', [points, userId]);
  
  // Or REST API call to your website:
  // await fetch(`https://your-website.com/api/users/${userId}/credits`, {
  //   method: 'PUT',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ credits: points })
  // });
}

// Main execution
async function main() {
  console.log('TacFit Points Sync Example');
  console.log('===========================');
  
  // Check API health
  try {
    const health = await tacfitAPI('/api/sync/health');
    console.log(`✓ API Status: ${health.status}`);
  } catch (error) {
    console.error('❌ API health check failed:', error.message);
    console.error('Make sure SYNC_API_KEY is set and TacFit is running');
    return;
  }
  
  try {
    // Example 1: Bulk sync
    await bulkSyncAllUsers();
    
    // Example 2: Individual user sync
    await syncUserById(1);
    
    // Example 3: Username sync
    await syncUserByUsername('Alpha');
    
  } catch (error) {
    console.error('\nSync process failed:', error.message);
  }
  
  console.log('\n✓ Sync examples completed!');
  console.log('\nNext steps:');
  console.log('1. Set SYNC_API_KEY environment variable');
  console.log('2. Adapt the database update functions to your system');
  console.log('3. Set up webhooks for real-time updates (optional)');
  console.log('4. Schedule periodic bulk syncs if needed');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  bulkSyncAllUsers,
  syncUserById,
  syncUserByUsername,
  setupWebhookHandler,
  updateUserCreditsInDatabase
};
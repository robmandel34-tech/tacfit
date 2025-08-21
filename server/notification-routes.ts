import type { Express } from "express";
import { db } from "./db";
import { pushSubscriptions, notificationPreferences, notificationLogs, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { PushNotificationService } from "./push-notification-service";

export function registerNotificationRoutes(app: Express) {
  
  // Get VAPID public key for client
  app.get('/api/notifications/vapid-key', (req, res) => {
    try {
      const publicKey = PushNotificationService.getVapidPublicKey();
      if (!publicKey) {
        return res.status(500).json({ error: 'VAPID keys not configured' });
      }
      res.json({ publicKey });
    } catch (error) {
      console.error('Error getting VAPID key:', error);
      res.status(500).json({ error: 'Failed to get VAPID key' });
    }
  });

  // Subscribe to push notifications
  app.post('/api/notifications/subscribe', async (req, res) => {
    try {
      const { subscription, userId } = req.body;
      
      if (!subscription || !userId) {
        return res.status(400).json({ error: 'Missing subscription or userId' });
      }

      // Check if subscription already exists
      const existing = await db
        .select()
        .from(pushSubscriptions)
        .where(and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, subscription.endpoint)
        ))
        .limit(1);

      // Validate subscription keys
      if (!subscription.keys?.p256dh || !subscription.keys?.auth) {
        return res.status(400).json({ error: 'Invalid subscription keys' });
      }

      console.log('Subscription keys:', {
        p256dh_length: subscription.keys.p256dh.length,
        auth_length: subscription.keys.auth.length,
        endpoint: subscription.endpoint.substring(0, 50) + '...'
      });

      if (existing.length > 0) {
        // Update existing subscription
        await db
          .update(pushSubscriptions)
          .set({
            p256dhKey: subscription.keys.p256dh,
            authKey: subscription.keys.auth,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(pushSubscriptions.id, existing[0].id));
      } else {
        // Create new subscription
        await db.insert(pushSubscriptions).values({
          userId: userId,
          endpoint: subscription.endpoint,
          p256dhKey: subscription.keys.p256dh,
          authKey: subscription.keys.auth,
          isActive: true,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      res.status(500).json({ error: 'Failed to subscribe to notifications' });
    }
  });

  // Unsubscribe from push notifications
  app.post('/api/notifications/unsubscribe', async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'Missing userId' });
      }

      // Deactivate all subscriptions for user
      await db
        .update(pushSubscriptions)
        .set({ 
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(pushSubscriptions.userId, userId));

      res.json({ success: true });
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      res.status(500).json({ error: 'Failed to unsubscribe from notifications' });
    }
  });

  // Get notification preferences
  app.get('/api/notifications/preferences/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid userId' });
      }

      const preferences = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .limit(1);

      if (preferences.length === 0) {
        // Create default preferences
        const defaultPrefs = {
          userId: userId,
          activityUpdates: true,
          competitionEvents: true,
          teamMessages: true,
          missionTasks: true,
          adminAnnouncements: true,
        };

        await db.insert(notificationPreferences).values(defaultPrefs);
        res.json(defaultPrefs);
      } else {
        res.json(preferences[0]);
      }
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      res.status(500).json({ error: 'Failed to get notification preferences' });
    }
  });

  // Update notification preferences
  app.put('/api/notifications/preferences', async (req, res) => {
    try {
      const { userId, preferences } = req.body;
      
      if (!userId || !preferences) {
        return res.status(400).json({ error: 'Missing userId or preferences' });
      }

      // Check if preferences exist
      const existing = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, userId))
        .limit(1);

      if (existing.length > 0) {
        // Update existing preferences
        await db
          .update(notificationPreferences)
          .set({
            ...preferences,
            updatedAt: new Date(),
          })
          .where(eq(notificationPreferences.userId, userId));
      } else {
        // Create new preferences
        await db.insert(notificationPreferences).values({
          userId: userId,
          ...preferences,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({ error: 'Failed to update notification preferences' });
    }
  });

  // Send notification to user
  app.post('/api/notifications/send', async (req, res) => {
    try {
      const { userId, notification } = req.body;
      
      if (!userId || !notification) {
        return res.status(400).json({ error: 'Missing userId or notification' });
      }

      // Get user's active subscriptions
      const subscriptions = await db
        .select()
        .from(pushSubscriptions)
        .where(and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.isActive, true)
        ));

      if (subscriptions.length === 0) {
        return res.json({ success: false, message: 'No active subscriptions found' });
      }

      // Convert database subscriptions to the format expected by web-push
      const webPushSubscriptions = subscriptions.map(sub => ({
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dhKey,
          auth: sub.authKey,
        },
      }));

      // Send notifications
      const results = await PushNotificationService.sendToMultipleUsers(
        webPushSubscriptions,
        notification
      );

      // Log the notification
      await db.insert(notificationLogs).values({
        userId: userId,
        type: notification.data?.type || 'general',
        title: notification.title,
        body: notification.body,
        data: JSON.stringify(notification.data || {}),
        sent: results.successful > 0,
        sentAt: results.successful > 0 ? new Date() : null,
      });

      res.json({ success: true, results });
    } catch (error) {
      console.error('Error sending notification:', error);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  });

  // Send notification to multiple users
  app.post('/api/notifications/send-bulk', async (req, res) => {
    try {
      const { userIds, notification, checkPreferences = true } = req.body;
      
      if (!userIds || !Array.isArray(userIds) || !notification) {
        return res.status(400).json({ error: 'Missing userIds array or notification' });
      }

      let targetUserIds = userIds;

      // Filter users based on notification preferences if requested
      if (checkPreferences && notification.data?.type) {
        const preferenceField = getPreferenceFieldForType(notification.data.type);
        if (preferenceField) {
          const usersWithPreferences = await db
            .select({ userId: notificationPreferences.userId })
            .from(notificationPreferences)
            .where(and(
              eq(notificationPreferences[preferenceField], true),
              // Add condition to check if userId is in the target list
            ));

          const enabledUserIds = usersWithPreferences.map(u => u.userId);
          targetUserIds = userIds.filter(id => enabledUserIds.includes(id));
        }
      }

      if (targetUserIds.length === 0) {
        return res.json({ success: true, message: 'No users with enabled preferences' });
      }

      // Get all active subscriptions for target users
      const subscriptions = await db
        .select()
        .from(pushSubscriptions)
        .where(and(
          eq(pushSubscriptions.isActive, true)
        ));

      const filteredSubscriptions = subscriptions.filter(sub => 
        targetUserIds.includes(sub.userId)
      );

      if (filteredSubscriptions.length === 0) {
        return res.json({ success: false, message: 'No active subscriptions found' });
      }

      // Convert to web-push format
      const webPushSubscriptions = filteredSubscriptions.map(sub => ({
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dhKey,
          auth: sub.authKey,
        },
      }));

      // Send notifications
      const results = await PushNotificationService.sendToMultipleUsers(
        webPushSubscriptions,
        notification
      );

      // Log notifications for each user
      const logEntries = targetUserIds.map(userId => ({
        userId: userId,
        type: notification.data?.type || 'general',
        title: notification.title,
        body: notification.body,
        data: JSON.stringify(notification.data || {}),
        sent: results.successful > 0,
        sentAt: results.successful > 0 ? new Date() : null,
      }));

      await db.insert(notificationLogs).values(logEntries);

      res.json({ success: true, results, targetUsers: targetUserIds.length });
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      res.status(500).json({ error: 'Failed to send bulk notifications' });
    }
  });

  // Get notification history for user
  app.get('/api/notifications/history/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = parseInt(req.query.limit as string) || 50;
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid userId' });
      }

      const history = await db
        .select()
        .from(notificationLogs)
        .where(eq(notificationLogs.userId, userId))
        .orderBy(notificationLogs.createdAt)
        .limit(limit);

      res.json(history);
    } catch (error) {
      console.error('Error getting notification history:', error);
      res.status(500).json({ error: 'Failed to get notification history' });
    }
  });

  // Mark notification as clicked
  app.post('/api/notifications/:id/clicked', async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      
      if (isNaN(notificationId)) {
        return res.status(400).json({ error: 'Invalid notification ID' });
      }

      await db
        .update(notificationLogs)
        .set({
          clicked: true,
          clickedAt: new Date(),
        })
        .where(eq(notificationLogs.id, notificationId));

      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as clicked:', error);
      res.status(500).json({ error: 'Failed to mark notification as clicked' });
    }
  });
}

// Helper function to map notification types to preference fields
function getPreferenceFieldForType(type: string): keyof typeof notificationPreferences.$inferSelect | null {
  switch (type) {
    case 'activity':
      return 'activityUpdates';
    case 'competition':
      return 'competitionEvents';
    case 'message':
      return 'teamMessages';
    case 'task':
      return 'missionTasks';
    case 'announcement':
      return 'adminAnnouncements';
    default:
      return null;
  }
}
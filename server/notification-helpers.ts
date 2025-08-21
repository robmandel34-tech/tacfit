import { db } from "./db";
import { pushSubscriptions, notificationPreferences, users, teams, activities, competitions } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { PushNotificationService, type NotificationPayload } from "./push-notification-service";

// Helper functions to trigger notifications for different events

export async function notifyActivitySubmission(activityId: number) {
  try {
    // Get activity details with user and team info
    const activity = await db
      .select({
        id: activities.id,
        type: activities.type,
        user: {
          id: users.id,
          username: users.username,
        },
        team: {
          id: teams.id,
          name: teams.name,
        }
      })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .leftJoin(teams, eq(activities.teamId, teams.id))
      .where(eq(activities.id, activityId))
      .limit(1);

    if (!activity.length) return;

    const activityData = activity[0];
    if (!activityData.team || !activityData.user || !activityData.user.id) return;

    // Get all team members except the submitter
    const teamMembers = await db
      .select({ userId: users.id })
      .from(users)
      .innerJoin(teams, eq(users.id, teams.captainId)) // Get team captain
      .where(eq(teams.id, activityData.team.id));

    // Also get regular team members (if we had team_members table)
    // For now, just notify team captain if they're not the submitter

    const targetUserIds = teamMembers
      .filter(member => member.userId !== activityData.user!.id)
      .map(member => member.userId);

    if (targetUserIds.length === 0) return;

    // Create notification
    const notification = PushNotificationService.createActivityNotification({
      userName: activityData.user.username,
      activityType: activityData.type,
      teamName: activityData.team.name,
    });

    // Send to target users with preference checking
    await sendNotificationToUsers(targetUserIds, notification, 'activity');

    console.log(`Activity notification sent for activity ${activityId} to ${targetUserIds.length} users`);
  } catch (error) {
    console.error('Error sending activity notification:', error);
  }
}

export async function notifyCompetitionEvent(
  competitionId: number, 
  eventType: 'starting' | 'ending' | 'join-window-open' | 'join-window-closing',
  timeRemaining?: string
) {
  try {
    // Get competition details
    const competition = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, competitionId))
      .limit(1);

    // For now, send to all users since we don't have competition participants easily accessible
    const allUsers = await db.select({ id: users.id }).from(users);
    const targetUserIds = allUsers.map(user => user.id);

    const competitionName = competition.length > 0 ? competition[0].name : 'Active Competition';
    
    const notification = PushNotificationService.createCompetitionNotification({
      competitionName,
      type: eventType,
      timeRemaining,
    });

    await sendNotificationToUsers(targetUserIds, notification, 'competition');

    console.log(`Competition ${eventType} notification sent to ${targetUserIds.length} users`);
  } catch (error) {
    console.error('Error sending competition notification:', error);
  }
}

export async function notifyTeamMessage(senderId: number, teamId: number, messagePreview: string) {
  try {
    // Get sender and team info
    const senderInfo = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, senderId))
      .limit(1);

    const teamInfo = await db
      .select({ name: teams.name })
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (!senderInfo.length || !teamInfo.length) return;

    // Get team members (for now, just team captain)
    const teamMembers = await db
      .select({ userId: teams.captainId })
      .from(teams)
      .where(eq(teams.id, teamId));

    const targetUserIds = teamMembers
      .filter(member => member.userId !== null && member.userId !== senderId)
      .map(member => member.userId!)
      .filter((id): id is number => id !== null);

    if (targetUserIds.length === 0) return;

    const notification = PushNotificationService.createTeamMessageNotification({
      senderName: senderInfo[0].username,
      teamName: teamInfo[0].name,
      messagePreview: messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : ''),
    });

    await sendNotificationToUsers(targetUserIds, notification, 'message');

    console.log(`Team message notification sent to ${targetUserIds.length} users`);
  } catch (error) {
    console.error('Error sending team message notification:', error);
  }
}

export async function notifyMissionTask(userId: number, taskTitle: string, type: 'new' | 'reminder' | 'overdue', dueDate?: string) {
  try {
    const notification = PushNotificationService.createMissionTaskNotification({
      taskTitle,
      type,
      dueDate,
    });

    await sendNotificationToUsers([userId], notification, 'task');

    console.log(`Mission task ${type} notification sent to user ${userId}`);
  } catch (error) {
    console.error('Error sending mission task notification:', error);
  }
}

export async function notifyAdminAnnouncement(title: string, preview: string) {
  try {
    // Send to all users
    const allUsers = await db.select({ id: users.id }).from(users);
    const targetUserIds = allUsers.map(user => user.id);

    const notification = PushNotificationService.createAdminAnnouncementNotification({
      title,
      preview: preview.substring(0, 100) + (preview.length > 100 ? '...' : ''),
    });

    await sendNotificationToUsers(targetUserIds, notification, 'announcement');

    console.log(`Admin announcement notification sent to ${targetUserIds.length} users`);
  } catch (error) {
    console.error('Error sending admin announcement notification:', error);
  }
}

// Helper function to send notifications to multiple users with preference checking
async function sendNotificationToUsers(
  userIds: number[], 
  notification: NotificationPayload, 
  notificationType: 'activity' | 'competition' | 'message' | 'task' | 'announcement'
) {
  try {
    // Get users who have this notification type enabled
    const preferences = await db
      .select()
      .from(notificationPreferences);

    const filteredUserIds = userIds.filter(userId => {
      const userPrefs = preferences.find(p => p.userId === userId);
      if (!userPrefs) return true; // Default to enabled if no preferences set

      switch (notificationType) {
        case 'activity':
          return userPrefs.activityUpdates;
        case 'competition':
          return userPrefs.competitionEvents;
        case 'message':
          return userPrefs.teamMessages;
        case 'task':
          return userPrefs.missionTasks;
        case 'announcement':
          return userPrefs.adminAnnouncements;
        default:
          return true;
      }
    });

    if (filteredUserIds.length === 0) return;

    // Get active subscriptions for these users
    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.isActive, true)
      ));

    const userSubscriptions = subscriptions.filter(sub => 
      filteredUserIds.includes(sub.userId)
    );

    if (userSubscriptions.length === 0) return;

    // Convert to web-push format
    const webPushSubscriptions = userSubscriptions.map(sub => ({
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dhKey,
        auth: sub.authKey,
      },
    }));

    // Send notifications
    await PushNotificationService.sendToMultipleUsers(webPushSubscriptions, notification);

  } catch (error) {
    console.error('Error in sendNotificationToUsers:', error);
    throw error;
  }
}
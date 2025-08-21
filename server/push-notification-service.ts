import webpush from 'web-push';

// VAPID keys for web push (these should be in environment variables)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hello@tacfit.app';

// Configure web-push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} else {
  console.warn('VAPID keys not configured. Push notifications will not work.');
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
}

export class PushNotificationService {
  
  static getVapidPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  }

  static async sendNotification(
    subscription: PushSubscription,
    payload: NotificationPayload
  ): Promise<boolean> {
    try {
      if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        console.error('VAPID keys not configured');
        return false;
      }

      const options = {
        TTL: 60 * 60 * 24, // 24 hours
        vapidDetails: {
          subject: VAPID_SUBJECT,
          publicKey: VAPID_PUBLIC_KEY,
          privateKey: VAPID_PRIVATE_KEY,
        },
      };

      await webpush.sendNotification(
        subscription,
        JSON.stringify(payload),
        options
      );

      console.log('Push notification sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      
      // Handle specific errors
      if (error && typeof error === 'object' && 'statusCode' in error) {
        const statusCode = (error as any).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          // Subscription is no longer valid, should be removed from database
          console.log('Subscription is no longer valid, should be removed');
          return false;
        }
      }
      
      return false;
    }
  }

  static async sendToMultipleUsers(
    subscriptions: PushSubscription[],
    payload: NotificationPayload
  ): Promise<{ successful: number; failed: number }> {
    const results = await Promise.allSettled(
      subscriptions.map(subscription => 
        this.sendNotification(subscription, payload)
      )
    );

    const successful = results.filter(result => 
      result.status === 'fulfilled' && result.value === true
    ).length;
    
    const failed = results.length - successful;

    console.log(`Push notifications sent: ${successful} successful, ${failed} failed`);
    
    return { successful, failed };
  }

  // Notification templates for different types
  static createActivityNotification(
    activityData: {
      userName: string;
      activityType: string;
      teamName: string;
    }
  ): NotificationPayload {
    return {
      title: 'Team Activity Update',
      body: `${activityData.userName} submitted ${activityData.activityType} activity in ${activityData.teamName}`,
      icon: '/generated-icon.png',
      badge: '/generated-icon.png',
      tag: 'activity-update',
      data: { type: 'activity', url: '/activity-feed' },
      actions: [
        { action: 'view', title: 'View Activity' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };
  }

  static createCompetitionNotification(
    competitionData: {
      competitionName: string;
      type: 'starting' | 'ending' | 'join-window-open' | 'join-window-closing';
      timeRemaining?: string;
    }
  ): NotificationPayload {
    let title = 'Competition Update';
    let body = '';
    let url = '/competitions';

    switch (competitionData.type) {
      case 'starting':
        title = 'Competition Starting';
        body = `${competitionData.competitionName} is starting now!`;
        break;
      case 'ending':
        title = 'Competition Ending';
        body = `${competitionData.competitionName} ends in ${competitionData.timeRemaining}`;
        break;
      case 'join-window-open':
        title = 'New Competition Available';
        body = `Join ${competitionData.competitionName} now!`;
        break;
      case 'join-window-closing':
        title = 'Join Window Closing';
        body = `Last chance to join ${competitionData.competitionName}`;
        break;
    }

    return {
      title,
      body,
      icon: '/generated-icon.png',
      badge: '/generated-icon.png',
      tag: 'competition-update',
      data: { type: 'competition', url },
      actions: [
        { action: 'view', title: 'View Competition' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };
  }

  static createTeamMessageNotification(
    messageData: {
      senderName: string;
      teamName: string;
      messagePreview: string;
    }
  ): NotificationPayload {
    return {
      title: `Message in ${messageData.teamName}`,
      body: `${messageData.senderName}: ${messageData.messagePreview}`,
      icon: '/generated-icon.png',
      badge: '/generated-icon.png',
      tag: 'team-message',
      data: { type: 'message', url: '/team' },
      actions: [
        { action: 'view', title: 'View Message' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };
  }

  static createMissionTaskNotification(
    taskData: {
      taskTitle: string;
      type: 'new' | 'reminder' | 'overdue';
      dueDate?: string;
    }
  ): NotificationPayload {
    let title = 'Mission Task';
    let body = '';

    switch (taskData.type) {
      case 'new':
        title = 'New Mission Task';
        body = `New task assigned: ${taskData.taskTitle}`;
        break;
      case 'reminder':
        title = 'Task Reminder';
        body = `Don't forget: ${taskData.taskTitle}`;
        if (taskData.dueDate) {
          body += ` (Due: ${taskData.dueDate})`;
        }
        break;
      case 'overdue':
        title = 'Overdue Task';
        body = `Overdue task: ${taskData.taskTitle}`;
        break;
    }

    return {
      title,
      body,
      icon: '/generated-icon.png',
      badge: '/generated-icon.png',
      tag: 'mission-task',
      data: { type: 'task', url: '/profile' },
      actions: [
        { action: 'view', title: 'View Task' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };
  }

  static createAdminAnnouncementNotification(
    announcementData: {
      title: string;
      preview: string;
    }
  ): NotificationPayload {
    return {
      title: 'Command Update',
      body: `${announcementData.title}: ${announcementData.preview}`,
      icon: '/generated-icon.png',
      badge: '/generated-icon.png',
      tag: 'admin-announcement',
      data: { type: 'announcement', url: '/activity-feed' },
      actions: [
        { action: 'view', title: 'View Update' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      requireInteraction: true // Admin announcements are important
    };
  }
}
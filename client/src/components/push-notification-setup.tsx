import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';

interface NotificationPreferences {
  activityUpdates: boolean;
  competitionEvents: boolean;
  teamMessages: boolean;
  missionTasks: boolean;
  adminAnnouncements: boolean;
}

export function PushNotificationSetup() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    activityUpdates: true,
    competitionEvents: true,
    teamMessages: true,
    missionTasks: true,
    adminAnnouncements: true,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 
                     'PushManager' in window && 
                     'Notification' in window;
    setIsSupported(supported);
    
    // Log current environment for debugging
    console.log('Push notification environment check:', {
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      notification: 'Notification' in window,
      protocol: location.protocol,
      hostname: location.hostname,
      isSecure: location.protocol === 'https:' || location.hostname === 'localhost',
      supported
    });
    
    if (supported) {
      setPermission(Notification.permission);
      // Check subscription status immediately and after service worker is ready
      checkSubscriptionStatus();
      loadPreferences();
      
      // Also check after service worker is fully ready
      setTimeout(() => {
        checkSubscriptionStatus();
      }, 2000);
    }
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const loadPreferences = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/notifications/preferences/${user.id}`);
      if (response.ok) {
        const prefs = await response.json();
        setPreferences(prefs);
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const requestPermission = async () => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported in this browser or context.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        await subscribeToPush();
        toast({
          title: "Notifications Enabled",
          description: "You'll now receive tactical updates and alerts.",
        });
      } else {
        toast({
          title: "Notifications Disabled",
          description: "Enable notifications in your browser settings to receive updates.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: "Error",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToPush = async () => {
    setIsLoading(true);
    try {
      console.log('Starting push subscription process...');
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      const registration = await navigator.serviceWorker.ready;
      console.log('Service worker ready:', registration);
      
      // Get VAPID public key from server
      console.log('Fetching VAPID key...');
      const response = await fetch('/api/notifications/vapid-key');
      if (!response.ok) {
        throw new Error(`Failed to get VAPID key: ${response.status}`);
      }
      const { publicKey } = await response.json();
      console.log('VAPID key received');
      
      console.log('Creating push subscription...');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      
      const subscriptionJSON = subscription.toJSON();
      console.log('Push subscription created:', {
        endpoint: subscription.endpoint,
        p256dh: subscriptionJSON.keys?.p256dh,
        p256dh_length: subscriptionJSON.keys?.p256dh?.length,
        auth: subscriptionJSON.keys?.auth,
        auth_length: subscriptionJSON.keys?.auth?.length
      });

      // Send subscription to server
      console.log('Sending subscription to server...');
      await apiRequest('/api/notifications/subscribe', 'POST', {
        subscription: subscriptionJSON,
        userId: user.id,
      });
      console.log('Subscription saved to server');

      setIsSubscribed(true);
      toast({
        title: "Subscribed Successfully",
        description: "You'll now receive push notifications.",
      });
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast({
        title: "Subscription Failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove subscription from server
        await apiRequest('/api/notifications/unsubscribe', 'POST', {
          userId: user?.id
        });
        
        setIsSubscribed(false);
        toast({
          title: "Notifications Disabled",
          description: "You will no longer receive push notifications.",
        });
      }
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast({
        title: "Error",
        description: "Failed to disable notifications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async (newPreferences: NotificationPreferences) => {
    if (!user?.id) return;

    try {
      await apiRequest('/api/notifications/preferences', 'PUT', {
        userId: user.id,
        preferences: newPreferences,
      });

      setPreferences(newPreferences);
      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    updatePreferences(newPreferences);
  };

  const sendTestNotification = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      await apiRequest('/api/test-notification', 'POST', {
        userId: user.id,
        type: 'test',
      });
      
      toast({
        title: "Test Notification Sent",
        description: "Check your device for the notification.",
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Test Failed",
        description: "Failed to send test notification.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to convert VAPID key
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  if (!isSupported) {
    return (
      <Card className="bg-surface-elevated border-border-subtle">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <BellOff className="h-5 w-5 text-gray-300" />
            Push Notifications Not Supported
          </CardTitle>
          <CardDescription className="text-gray-300">
            Push notifications require HTTPS and are only available when the app is deployed. 
            {location.protocol !== 'https:' && location.hostname !== 'localhost' && (
              <div className="mt-2 text-sm">
                Current environment: {location.protocol} (HTTPS required for deployment)
              </div>
            )}
            <div className="mt-2 text-xs text-gray-400">
              ServiceWorker: {'serviceWorker' in navigator ? '✓' : '✗'} | 
              PushManager: {'PushManager' in window ? '✓' : '✗'} | 
              Notifications: {'Notification' in window ? '✓' : '✗'}
            </div>
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-surface-elevated border-border-subtle">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Bell className="h-5 w-5 text-military-green" />
          Push Notifications
        </CardTitle>
        <CardDescription className="text-gray-300">
          Get notified about team activities, competitions, and important updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-white">Notification Permission</h3>
            <p className="text-sm text-gray-300">
              {permission === 'granted' && 'Notifications are enabled'}
              {permission === 'denied' && 'Notifications are blocked'}
              {permission === 'default' && 'Click to enable notifications'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {permission === 'granted' ? (
              <div className="flex items-center gap-2 text-military-green">
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium">Enabled</span>
              </div>
            ) : permission === 'denied' ? (
              <div className="flex items-center gap-2 text-red-500">
                <X className="h-4 w-4" />
                <span className="text-sm font-medium">Blocked</span>
              </div>
            ) : (
              <Button 
                onClick={requestPermission} 
                disabled={isLoading}
                size="sm"
                className="bg-military-green hover:bg-military-green/90"
              >
                Enable Notifications
              </Button>
            )}
          </div>
        </div>

        {/* Subscription Status */}
        {permission === 'granted' && (
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-white">Push Subscription</h3>
              <p className="text-sm text-gray-300">
                {isSubscribed ? 'Receiving push notifications' : 'Not subscribed to push notifications'}
              </p>
            </div>
            <Button
              onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
              disabled={isLoading}
              variant={isSubscribed ? "destructive" : "default"}
              size="sm"
            >
              {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
            </Button>
          </div>
        )}

        {/* Notification Preferences */}
        {permission === 'granted' && isSubscribed && (
          <div className="space-y-4">
            <h3 className="font-medium text-white">Notification Types</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="activity-updates" className="font-medium text-white">Activity Updates</Label>
                  <p className="text-sm text-gray-300">Team member activity submissions and achievements</p>
                </div>
                <Switch
                  id="activity-updates"
                  checked={preferences.activityUpdates}
                  onCheckedChange={(value) => handlePreferenceChange('activityUpdates', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="competition-events" className="font-medium text-white">Competition Events</Label>
                  <p className="text-sm text-gray-300">Competition start/end times and join windows</p>
                </div>
                <Switch
                  id="competition-events"
                  checked={preferences.competitionEvents}
                  onCheckedChange={(value) => handlePreferenceChange('competitionEvents', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="team-messages" className="font-medium text-white">Team Messages</Label>
                  <p className="text-sm text-gray-300">New messages in team chat</p>
                </div>
                <Switch
                  id="team-messages"
                  checked={preferences.teamMessages}
                  onCheckedChange={(value) => handlePreferenceChange('teamMessages', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="mission-tasks" className="font-medium text-white">Mission Tasks</Label>
                  <p className="text-sm text-gray-300">Task assignments and reminders</p>
                </div>
                <Switch
                  id="mission-tasks"
                  checked={preferences.missionTasks}
                  onCheckedChange={(value) => handlePreferenceChange('missionTasks', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="admin-announcements" className="font-medium text-white">Admin Announcements</Label>
                  <p className="text-sm text-gray-300">Intel Feed posts and important updates</p>
                </div>
                <Switch
                  id="admin-announcements"
                  checked={preferences.adminAnnouncements}
                  onCheckedChange={(value) => handlePreferenceChange('adminAnnouncements', value)}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
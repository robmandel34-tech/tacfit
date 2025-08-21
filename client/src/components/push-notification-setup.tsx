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
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      checkSubscriptionStatus();
      loadPreferences();
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
    if (!isSupported) return;

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
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID public key from server
      const response = await fetch('/api/notifications/vapid-key');
      const { publicKey } = await response.json();
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to server
      await apiRequest('/api/notifications/subscribe', 'POST', {
        subscription: subscription.toJSON(),
        userId: user?.id,
      });

      setIsSubscribed(true);
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      throw error;
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
          <CardTitle className="flex items-center gap-2 text-heading">
            <BellOff className="h-5 w-5 text-text-secondary" />
            Push Notifications Not Supported
          </CardTitle>
          <CardDescription className="text-text-secondary">
            Your browser doesn't support push notifications.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-surface-elevated border-border-subtle">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-heading">
          <Bell className="h-5 w-5 text-military-green" />
          Push Notifications
        </CardTitle>
        <CardDescription className="text-text-secondary">
          Get notified about team activities, competitions, and important updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-heading">Notification Permission</h3>
            <p className="text-sm text-text-secondary">
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
              <h3 className="font-medium text-heading">Push Subscription</h3>
              <p className="text-sm text-text-secondary">
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
            <h3 className="font-medium text-heading">Notification Types</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="activity-updates" className="font-medium text-heading">Activity Updates</Label>
                  <p className="text-sm text-text-secondary">Team member activity submissions and achievements</p>
                </div>
                <Switch
                  id="activity-updates"
                  checked={preferences.activityUpdates}
                  onCheckedChange={(value) => handlePreferenceChange('activityUpdates', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="competition-events" className="font-medium text-heading">Competition Events</Label>
                  <p className="text-sm text-text-secondary">Competition start/end times and join windows</p>
                </div>
                <Switch
                  id="competition-events"
                  checked={preferences.competitionEvents}
                  onCheckedChange={(value) => handlePreferenceChange('competitionEvents', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="team-messages" className="font-medium text-heading">Team Messages</Label>
                  <p className="text-sm text-text-secondary">New messages in team chat</p>
                </div>
                <Switch
                  id="team-messages"
                  checked={preferences.teamMessages}
                  onCheckedChange={(value) => handlePreferenceChange('teamMessages', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="mission-tasks" className="font-medium text-heading">Mission Tasks</Label>
                  <p className="text-sm text-text-secondary">Task assignments and reminders</p>
                </div>
                <Switch
                  id="mission-tasks"
                  checked={preferences.missionTasks}
                  onCheckedChange={(value) => handlePreferenceChange('missionTasks', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="admin-announcements" className="font-medium text-heading">Admin Announcements</Label>
                  <p className="text-sm text-text-secondary">Intel Feed posts and important updates</p>
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
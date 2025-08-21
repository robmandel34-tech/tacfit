import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export function NotificationTest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const notificationTypes = [
    { value: 'activity', label: 'Team Activity Update', description: 'Teammate submitted a new activity' },
    { value: 'competition', label: 'Competition Event', description: 'Competition starting notification' },
    { value: 'message', label: 'Team Message', description: 'New message in team chat' },
    { value: 'announcement', label: 'Admin Announcement', description: 'Important update from command' },
    { value: 'test', label: 'Generic Test', description: 'Basic test notification' },
  ];

  const sendTestNotification = async () => {
    if (!selectedType || !user?.id) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: selectedType,
          userId: user.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Test Notification Sent",
          description: `${selectedType} notification sent successfully. Check your device for the notification.`,
        });
      } else {
        toast({
          title: "Notification Failed",
          description: result.message || "Failed to send notification. Make sure you're subscribed to push notifications.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Error",
        description: "Failed to send test notification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-surface-elevated border-border-subtle">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Bell className="h-5 w-5 text-military-green" />
          Test Push Notifications
        </CardTitle>
        <CardDescription className="text-gray-300">
          Send test notifications to verify your push notification setup is working properly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-white">Notification Type</label>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="bg-surface-elevated border-border-subtle">
              <SelectValue placeholder="Choose a notification type to test" />
            </SelectTrigger>
            <SelectContent>
              {notificationTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-sm text-text-secondary">{type.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={sendTestNotification}
          disabled={!selectedType || isLoading}
          className="w-full bg-military-green hover:bg-military-green/90"
        >
          <Send className="h-4 w-4 mr-2" />
          {isLoading ? 'Sending...' : 'Send Test Notification'}
        </Button>

        <div className="text-sm text-gray-300">
          <p className="font-medium mb-2 text-white">To test notifications:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>First enable notifications in the settings above</li>
            <li>Select a notification type from the dropdown</li>
            <li>Click "Send Test Notification"</li>
            <li>Check your device for the notification</li>
            <li>Click the notification to test navigation</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
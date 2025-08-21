import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export function NotificationDebug() {
  const [debugInfo, setDebugInfo] = useState({
    serviceWorkerSupported: false,
    pushManagerSupported: false,
    notificationSupported: false,
    serviceWorkerRegistered: false,
    currentPermission: 'default' as NotificationPermission,
    isSecureContext: false,
    userAgent: '',
  });

  useEffect(() => {
    const checkSupport = async () => {
      const info = {
        serviceWorkerSupported: 'serviceWorker' in navigator,
        pushManagerSupported: 'PushManager' in window,
        notificationSupported: 'Notification' in window,
        serviceWorkerRegistered: false,
        currentPermission: 'Notification' in window ? Notification.permission : 'default' as NotificationPermission,
        isSecureContext: window.isSecureContext,
        userAgent: navigator.userAgent,
      };

      // Check if service worker is registered
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          info.serviceWorkerRegistered = !!registration;
        } catch (error) {
          console.error('Error checking service worker registration:', error);
        }
      }

      setDebugInfo(info);
    };

    checkSupport();
  }, []);

  const testBasicNotification = async () => {
    if (!('Notification' in window)) {
      alert('Notifications not supported');
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a basic browser notification test',
        icon: '/generated-icon.png'
      });
    } else if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('Test Notification', {
          body: 'Permission granted! This is a test notification.',
          icon: '/generated-icon.png'
        });
      }
    } else {
      alert('Notifications are blocked. Please enable them in browser settings.');
    }
  };

  const StatusBadge = ({ condition, label }: { condition: boolean; label: string }) => (
    <div className="flex items-center gap-2">
      {condition ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      )}
      <span className="text-sm">{label}</span>
      <Badge variant={condition ? 'secondary' : 'destructive'}>
        {condition ? 'Supported' : 'Not Supported'}
      </Badge>
    </div>
  );

  return (
    <Card className="bg-surface-elevated border-border-subtle">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-heading">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          Notification System Debug
        </CardTitle>
        <CardDescription className="text-text-secondary">
          Diagnostic information for push notification troubleshooting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <StatusBadge 
            condition={debugInfo.serviceWorkerSupported} 
            label="Service Worker Support" 
          />
          <StatusBadge 
            condition={debugInfo.pushManagerSupported} 
            label="Push Manager Support" 
          />
          <StatusBadge 
            condition={debugInfo.notificationSupported} 
            label="Notification API Support" 
          />
          <StatusBadge 
            condition={debugInfo.serviceWorkerRegistered} 
            label="Service Worker Registered" 
          />
          <StatusBadge 
            condition={debugInfo.isSecureContext} 
            label="Secure Context (HTTPS)" 
          />
        </div>

        <div className="space-y-2">
          <div className="text-sm">
            <strong>Current Permission:</strong>{' '}
            <Badge variant={
              debugInfo.currentPermission === 'granted' ? 'secondary' :
              debugInfo.currentPermission === 'denied' ? 'destructive' : 'outline'
            }>
              {debugInfo.currentPermission}
            </Badge>
          </div>
          
          <div className="text-xs text-text-secondary">
            <strong>User Agent:</strong> {debugInfo.userAgent.substring(0, 100)}...
          </div>
        </div>

        <Button 
          onClick={testBasicNotification}
          className="w-full bg-yellow-600 hover:bg-yellow-700"
          disabled={!debugInfo.notificationSupported}
        >
          Test Basic Browser Notification
        </Button>

        <div className="text-xs text-text-secondary space-y-1">
          <p><strong>Troubleshooting Tips:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Ensure you're using HTTPS (secure context required)</li>
            <li>Check if browser notifications are enabled in settings</li>
            <li>Try refreshing the page to re-register service worker</li>
            <li>Some browsers block notifications in incognito/private mode</li>
            <li>Replit preview may have different notification support than production</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
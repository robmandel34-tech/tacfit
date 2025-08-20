import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { 
  Smartphone, 
  Heart, 
  Activity, 
  Zap, 
  Clock, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Shield,
  Download,
  BarChart3,
  Watch,
  AppleIcon as Apple
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AppleHealthConnection {
  id: number;
  userId: number;
  isEnabled: boolean;
  setupCompleted: boolean;
  healthKitAuthToken?: string;
  permissionsGranted?: string[];
  deviceInfo?: any;
  lastSyncAt?: string;
}

interface AppleHealthWorkout {
  id: number;
  workoutType: string;
  duration?: number;
  totalEnergyBurned?: number;
  totalDistance?: string;
  averageHeartRate?: number;
  maxHeartRate?: number;
  startDate: string;
  endDate: string;
  sourceApp?: string;
  deviceModel?: string;
  isConverted: boolean;
  activityId?: number;
}

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        healthKit?: {
          postMessage: (message: any) => void;
        };
      };
    };
  }
}

export function AppleHealthKitIntegration({ userId, competitionId, teamId }: { userId: number; competitionId?: number; teamId?: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showWorkoutsDialog, setShowWorkoutsDialog] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  // Check if running in iOS (all browsers on iOS use WebKit due to Apple requirements)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isWebKit = typeof window.webkit !== 'undefined';
  const isIOSChrome = isIOS && /CriOS/.test(navigator.userAgent);
  const isIOSSafari = isIOS && /Safari/.test(navigator.userAgent) && !/CriOS/.test(navigator.userAgent);
  const isIOSFirefox = isIOS && /FxiOS/.test(navigator.userAgent);
  
  // All iOS browsers support HealthKit since they all use WebKit
  const supportsHealthKit = isIOS;

  // Get Apple HealthKit connection status
  const { data: connection, isLoading } = useQuery<AppleHealthConnection>({
    queryKey: ['apple-healthkit-status', userId],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/apple-healthkit/status');
      return await response.json();
    }
  });

  // Get Apple HealthKit workouts
  const { data: workouts } = useQuery<AppleHealthWorkout[]>({
    queryKey: ['apple-healthkit-workouts', userId],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/apple-healthkit/workouts');
      return await response.json();
    },
    enabled: connection?.isEnabled && connection?.setupCompleted
  });

  // HealthKit Authorization
  const authorizeHealthKit = async () => {
    if (!supportsHealthKit) {
      toast({
        title: "Not Supported",
        description: "Apple HealthKit is only available on iOS devices (iPhone or iPad).",
        variant: "destructive",
      });
      return;
    }

    setIsAuthorizing(true);

    // Set a timeout to reset authorization state after 30 seconds
    const authTimeout = setTimeout(() => {
      setIsAuthorizing(false);
      toast({
        title: "Authorization Timeout",
        description: "Authorization took too long. Please try again.",
        variant: "destructive",
      });
    }, 30000);

    try {
      // Request HealthKit permissions
      const permissions = [
        'HKQuantityTypeIdentifierStepCount',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKQuantityTypeIdentifierHeartRate',
        'HKQuantityTypeIdentifierDistanceWalkingRunning',
        'HKWorkoutTypeIdentifier'
      ];

      // Use iOS HealthKit authorization
      if (window.webkit?.messageHandlers?.healthKit) {
        // In-app WebView with HealthKit bridge
        window.webkit.messageHandlers.healthKit.postMessage({
          action: 'requestAuthorization',
          permissions: permissions
        });
      } else {
        // iOS browsers (Safari, Chrome, Firefox) - redirect to HealthKit authorization
        const authUrl = `/api/apple-healthkit/authorize?permissions=${permissions.join(',')}&userId=${userId}`;
        
        // Add browser info for better debugging
        const browserInfo = isIOSChrome ? 'Chrome' : isIOSSafari ? 'Safari' : isIOSFirefox ? 'Firefox' : 'Unknown';
        console.log(`HealthKit authorization starting on iOS ${browserInfo}...`);
        
        window.location.href = authUrl;
      }

      // Clear timeout if authorization succeeds before timeout
      return () => clearTimeout(authTimeout);
    } catch (error) {
      clearTimeout(authTimeout);
      console.error('HealthKit authorization error:', error);
      toast({
        title: "Authorization Failed",
        description: "Could not connect to Apple HealthKit. Please try again.",
        variant: "destructive",
      });
      setIsAuthorizing(false);
    }
  };



  // Manual sync
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/apple-healthkit/sync', {});
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sync failed: ${errorText}`);
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apple-healthkit-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['apple-healthkit-status'] });
      toast({
        title: "Sync Complete",
        description: "Latest HealthKit data has been synced successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync HealthKit data",
        variant: "destructive",
      });
    }
  });

  // Disable integration
  const disableMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/apple-healthkit/disable');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apple-healthkit-status'] });
      toast({
        title: "Integration Disabled",
        description: "Apple HealthKit integration has been disabled.",
      });
    }
  });

  // Handle authorization callback from WebView and URL redirects
  useEffect(() => {
    const handleHealthKitCallback = (event: MessageEvent) => {
      if (event.data?.source === 'healthkit') {
        setIsAuthorizing(false);
        if (event.data.success) {
          queryClient.invalidateQueries({ queryKey: ['apple-healthkit-status'] });
          toast({
            title: "HealthKit Connected",
            description: "Successfully connected to Apple HealthKit!",
          });
        } else {
          toast({
            title: "Authorization Failed",
            description: event.data.error || "Failed to authorize HealthKit access",
            variant: "destructive",
          });
        }
      }
    };

    // Check URL parameters for authorization result (from Safari redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const healthkitResult = urlParams.get('healthkit');
    
    if (healthkitResult && isAuthorizing) {
      setIsAuthorizing(false);
      if (healthkitResult === 'success') {
        queryClient.invalidateQueries({ queryKey: ['apple-healthkit-status'] });
        toast({
          title: "HealthKit Connected",
          description: "Successfully connected to Apple HealthKit!",
        });
        // Clean up URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (healthkitResult === 'error') {
        toast({
          title: "Authorization Failed",
          description: "Failed to authorize HealthKit access. Please try again.",
          variant: "destructive",
        });
        // Clean up URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    window.addEventListener('message', handleHealthKitCallback);
    return () => window.removeEventListener('message', handleHealthKitCallback);
  }, [queryClient, toast, isAuthorizing]);

  if (isLoading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-12 bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isConnected = connection?.isEnabled && connection?.setupCompleted;
  const hasWorkouts = workouts && workouts.length > 0;

  return (
    <>
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center space-x-2">
            <Apple className="h-5 w-5 text-military-green" />
            <span>Apple HealthKit</span>
            {isConnected && (
              <Badge variant="outline" className="bg-green-900/20 text-green-300 border-green-600/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <>
              <div className="bg-blue-900/20 border border-blue-600/30 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-300 mb-2 flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Connect Your Apple HealthKit
                </h4>
                <p className="text-sm text-gray-300 mb-4">
                  Connect your Apple Health to sync workouts, steps, heart rate, and calories data. 
                  View your health statistics and track your fitness progress over time.
                  {isIOSChrome && (
                    <span className="block mt-2 text-xs text-blue-300">
                      Works with Chrome on iOS! All iOS browsers support HealthKit.
                    </span>
                  )}
                </p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <Activity className="h-3 w-3 text-green-400" />
                    <span>Workouts & Activities</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <Heart className="h-3 w-3 text-red-400" />
                    <span>Heart Rate Data</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <Zap className="h-3 w-3 text-yellow-400" />
                    <span>Steps & Calories</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-gray-400">
                    <Watch className="h-3 w-3 text-blue-400" />
                    <span>Apple Watch Data</span>
                  </div>
                </div>
                
                {!supportsHealthKit && (
                  <div className="bg-orange-900/20 border border-orange-600/30 p-3 rounded-lg mb-4">
                    <div className="flex items-center space-x-2 text-orange-300 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>
                        {isIOS 
                          ? "Please refresh the page or try again - HealthKit should work on all iOS browsers" 
                          : "HealthKit integration requires an iOS device (iPhone or iPad)"
                        }
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <Button 
                onClick={authorizeHealthKit}
                className="w-full bg-military-green hover:bg-military-green/80"
                disabled={isAuthorizing || !supportsHealthKit}
              >
                {isAuthorizing ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Connecting to HealthKit...
                    Connecting...
                  </>
                ) : (
                  <>
                    <Apple className="h-4 w-4 mr-2" />
                    {supportsHealthKit ? 'Connect Apple HealthKit' : 'iOS Device Required'}
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="bg-green-900/20 border border-green-600/30 p-4 rounded-lg">
                <h4 className="font-semibold text-green-300 mb-2 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Apple HealthKit Connected
                </h4>
                <div className="space-y-2 text-sm text-gray-300">
                  {connection?.lastSyncAt && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span>Last sync: {new Date(connection.lastSyncAt).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-3 w-3 text-gray-400" />
                    <span>{workouts?.length || 0} workouts synced</span>
                  </div>
                  {connection?.deviceInfo && (
                    <div className="flex items-center space-x-2">
                      <Smartphone className="h-3 w-3 text-gray-400" />
                      <span>{connection.deviceInfo.model || 'iOS Device'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending}
                    className="border-gray-600 hover:bg-gray-700 w-full sm:w-auto"
                  >
                    {syncMutation.isPending ? (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Sync Now
                  </Button>
                  
                  {hasWorkouts && (
                    <Button 
                      variant="outline"
                      onClick={() => setShowWorkoutsDialog(true)}
                      className="flex-1 border-gray-600 hover:bg-gray-700 w-full sm:flex-1"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      <span className="truncate">View Workouts ({workouts.length})</span>
                    </Button>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => disableMutation.mutate()}
                  className="border-red-600/50 text-red-400 hover:bg-red-900/20 w-full sm:w-auto"
                  disabled={disableMutation.isPending}
                >
                  Disconnect
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Workouts Dialog */}
      <Dialog open={showWorkoutsDialog} onOpenChange={setShowWorkoutsDialog}>
        <DialogContent className="max-w-4xl bg-gray-900 border-gray-700 max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center space-x-2">
              <Activity className="h-5 w-5 text-military-green" />
              <span>Apple HealthKit Workouts</span>
              <Badge variant="outline" className="bg-blue-900/20 text-blue-300 border-blue-600/30">
                {workouts?.length || 0} workouts
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-3">
            {workouts?.map((workout) => (
              <HealthKitWorkoutCard
                key={workout.id}
                workout={workout}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function HealthKitWorkoutCard({ 
  workout
}: { 
  workout: AppleHealthWorkout;
}) {

  const getWorkoutIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('run')) return <Activity className="h-4 w-4 text-red-400" />;
    if (lowerType.includes('cycling')) return <Activity className="h-4 w-4 text-blue-400" />;
    if (lowerType.includes('strength') || lowerType.includes('weight')) return <Zap className="h-4 w-4 text-yellow-400" />;
    return <Activity className="h-4 w-4 text-military-green" />;
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {getWorkoutIcon(workout.workoutType)}
              <h4 className="font-semibold text-white">{workout.workoutType}</h4>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-400">
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{workout.duration} min</span>
              </div>
              {workout.totalEnergyBurned && (
                <div className="flex items-center space-x-1">
                  <Zap className="h-3 w-3" />
                  <span>{workout.totalEnergyBurned} cal</span>
                </div>
              )}
              {workout.averageHeartRate && (
                <div className="flex items-center space-x-1">
                  <Heart className="h-3 w-3" />
                  <span>{workout.averageHeartRate} bpm</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(workout.startDate).toLocaleDateString()}</span>
              </div>
            </div>

            {workout.deviceModel && (
              <div className="mt-2 text-xs text-gray-500">
                Device: {workout.deviceModel}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
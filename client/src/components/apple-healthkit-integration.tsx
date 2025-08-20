import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  // Check if running in iOS Safari/WebView
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isWebKit = typeof window.webkit !== 'undefined';
  const supportsHealthKit = isIOS && (isWebKit || window.navigator.userAgent.includes('Safari'));

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
        description: "Apple HealthKit is only available on iOS devices with Safari.",
        variant: "destructive",
      });
      return;
    }

    setIsAuthorizing(true);

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
        // Safari - redirect to HealthKit authorization
        const authUrl = `/api/apple-healthkit/authorize?permissions=${permissions.join(',')}&userId=${userId}`;
        window.location.href = authUrl;
      }
    } catch (error) {
      console.error('HealthKit authorization error:', error);
      toast({
        title: "Authorization Failed",
        description: "Could not connect to Apple HealthKit. Please try again.",
        variant: "destructive",
      });
      setIsAuthorizing(false);
    }
  };

  // Convert workout to activity
  const convertWorkoutMutation = useMutation({
    mutationFn: async ({ workoutId, activityType }: { workoutId: number; activityType: string }) => {
      const response = await apiRequest('POST', `/api/apple-healthkit/workouts/${workoutId}/convert`, {
        activityType,
        competitionId,
        teamId
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apple-healthkit-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast({
        title: "Workout Converted",
        description: "Apple HealthKit workout has been converted to a TacFit activity with full points!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Conversion Failed",
        description: error.message || "Failed to convert workout to activity",
        variant: "destructive",
      });
    }
  });

  // Manual sync
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/apple-healthkit/sync');
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

  // Handle authorization callback
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

    window.addEventListener('message', handleHealthKitCallback);
    return () => window.removeEventListener('message', handleHealthKitCallback);
  }, [queryClient, toast]);

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
  const unconvertedWorkouts = workouts?.filter(w => !w.isConverted) || [];

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
                  Automatically sync your workouts, steps, heart rate, and calories from Apple Health. 
                  Get full points (30) for verified health data from your iPhone and Apple Watch.
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
                      <span>HealthKit requires iOS Safari or supported WebView</span>
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

              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  className="border-gray-600 hover:bg-gray-700"
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
                    className="flex-1 border-gray-600 hover:bg-gray-700"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    View Workouts ({unconvertedWorkouts.length} new)
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => disableMutation.mutate()}
                  className="border-red-600/50 text-red-400 hover:bg-red-900/20"
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
              {unconvertedWorkouts.length > 0 && (
                <Badge variant="outline" className="bg-blue-900/20 text-blue-300 border-blue-600/30">
                  {unconvertedWorkouts.length} new
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-3">
            {workouts?.map((workout) => (
              <HealthKitWorkoutCard
                key={workout.id}
                workout={workout}
                onConvert={(activityType) => 
                  convertWorkoutMutation.mutate({ workoutId: workout.id, activityType })
                }
                isConverting={convertWorkoutMutation.isPending}
                canConvert={!!competitionId && !!teamId && !workout.isConverted}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function HealthKitWorkoutCard({ 
  workout, 
  onConvert, 
  isConverting, 
  canConvert 
}: { 
  workout: AppleHealthWorkout;
  onConvert: (activityType: string) => void;
  isConverting: boolean;
  canConvert: boolean;
}) {
  const [selectedActivityType, setSelectedActivityType] = useState<string>('');

  const getWorkoutIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('run')) return <Activity className="h-4 w-4 text-red-400" />;
    if (lowerType.includes('cycling')) return <Activity className="h-4 w-4 text-blue-400" />;
    if (lowerType.includes('strength') || lowerType.includes('weight')) return <Zap className="h-4 w-4 text-yellow-400" />;
    return <Activity className="h-4 w-4 text-military-green" />;
  };

  return (
    <Card className={`${workout.isConverted ? 'bg-green-900/20 border-green-600/30' : 'bg-gray-800/50 border-gray-700'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              {getWorkoutIcon(workout.workoutType)}
              <h4 className="font-semibold text-white">{workout.workoutType}</h4>
              {workout.isConverted && (
                <Badge variant="outline" className="bg-green-900/20 text-green-300 border-green-600/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Converted
                </Badge>
              )}
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

          {canConvert && (
            <div className="flex items-center space-x-2">
              <Select value={selectedActivityType} onValueChange={setSelectedActivityType}>
                <SelectTrigger className="w-32 bg-gray-800 border-gray-600">
                  <SelectValue placeholder="Activity" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="cardio">Cardio</SelectItem>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="flexibility">Flexibility</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                size="sm"
                onClick={() => selectedActivityType && onConvert(selectedActivityType)}
                disabled={!selectedActivityType || isConverting}
                className="bg-military-green hover:bg-military-green/80"
              >
                {isConverting ? (
                  <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
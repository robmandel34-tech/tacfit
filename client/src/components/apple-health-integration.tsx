import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  ExternalLink,
  Download,
  BarChart3
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AppleHealthConnection {
  id: number;
  userId: number;
  isEnabled: boolean;
  setupCompleted: boolean;
  apiKey?: string;
  lastSyncAt?: string;
  shortcutVersion?: string;
}

interface AppleHealthWorkout {
  id: number;
  workoutType: string;
  duration?: number;
  totalEnergyBurned?: number;
  totalDistance?: string;
  startDate: string;
  endDate: string;
  sourceApp?: string;
  isConverted: boolean;
  activityId?: number;
}

export function AppleHealthIntegration({ userId, competitionId, teamId }: { userId: number; competitionId?: number; teamId?: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showWorkoutsDialog, setShowWorkoutsDialog] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [setupUrl, setSetupUrl] = useState<string>('');

  // Get Apple Health connection status
  const { data: connection, isLoading } = useQuery<AppleHealthConnection>({
    queryKey: ['apple-health-status', userId],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/apple-health/status');
      return await response.json();
    }
  });

  // Get Apple Health workouts
  const { data: workouts } = useQuery<AppleHealthWorkout[]>({
    queryKey: ['apple-health-workouts', userId],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/apple-health/workouts');
      return await response.json();
    },
    enabled: connection?.isEnabled && connection?.setupCompleted
  });

  // Setup Apple Health integration
  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/apple-health/setup');
      return await response.json();
    },
    onSuccess: (data) => {
      setApiKey(data.apiKey);
      setSetupUrl(data.setupUrl);
      setShowSetupDialog(true);
      queryClient.invalidateQueries({ queryKey: ['apple-health-status'] });
      toast({
        title: "Setup Ready",
        description: "Your Apple Health API key is ready. Follow the setup guide to complete integration.",
      });
    },
    onError: (error: any) => {
      console.error('Apple Health setup error:', error);
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        toast({
          title: "Authentication Required",
          description: "Please log out and log back in to refresh your session, then try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Setup Failed",
          description: error.message || "Failed to setup Apple Health integration",
          variant: "destructive",
        });
      }
    }
  });

  // Convert workout to activity
  const convertWorkoutMutation = useMutation({
    mutationFn: async ({ workoutId, activityType }: { workoutId: number; activityType: string }) => {
      const response = await apiRequest('POST', `/api/apple-health/workouts/${workoutId}/convert`, {
        activityType,
        competitionId,
        teamId
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apple-health-workouts'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast({
        title: "Workout Converted",
        description: "Apple Health workout has been converted to a TacFit activity with full points!",
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

  // Disable integration
  const disableMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/apple-health/disable');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apple-health-status'] });
      toast({
        title: "Integration Disabled",
        description: "Apple Health integration has been disabled.",
      });
    }
  });

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
            <Smartphone className="h-5 w-5 text-military-green" />
            <span>Apple Health Integration</span>
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
                  <Smartphone className="h-4 w-4 mr-2" />
                  Connect Your Apple Health Data
                </h4>
                <p className="text-sm text-gray-300 mb-4">
                  Automatically sync your workouts, steps, heart rate, and calories from Apple Health to TacFit. 
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
                    <CheckCircle className="h-3 w-3 text-military-green" />
                    <span>Verified Evidence</span>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => setupMutation.mutate()}
                className="w-full bg-military-green hover:bg-military-green/80"
                disabled={setupMutation.isPending}
              >
                {setupMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Smartphone className="h-4 w-4 mr-2" />
                    Connect Apple Health
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="bg-green-900/20 border border-green-600/30 p-4 rounded-lg">
                <h4 className="font-semibold text-green-300 mb-2 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Apple Health Connected
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
                </div>
              </div>

              {hasWorkouts && (
                <div className="flex space-x-2">
                  <Button 
                    variant="outline"
                    onClick={() => setShowWorkoutsDialog(true)}
                    className="flex-1 border-gray-600 hover:bg-gray-700"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    View Workouts ({unconvertedWorkouts.length} new)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => disableMutation.mutate()}
                    className="border-red-600/50 text-red-400 hover:bg-red-900/20"
                    disabled={disableMutation.isPending}
                  >
                    Disconnect
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-2xl bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center space-x-2">
              <Smartphone className="h-5 w-5 text-military-green" />
              <span>Apple Health Setup Guide</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="bg-military-green/10 border border-military-green/30 p-4 rounded-lg">
              <h4 className="font-semibold text-military-green mb-2">Your API Key</h4>
              <div className="bg-gray-800 p-3 rounded font-mono text-sm text-gray-300 break-all">
                {apiKey}
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-600/30 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-300 mb-3">Setup Instructions:</h4>
              <div className="space-y-4 text-sm text-gray-300">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-military-green flex items-center justify-center text-xs font-bold text-black">1</div>
                  <div>
                    <p className="font-medium">Open iPhone Shortcuts app</p>
                    <p className="text-gray-400">Download from App Store if not installed</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-military-green flex items-center justify-center text-xs font-bold text-black">2</div>
                  <div>
                    <p className="font-medium">Create a new shortcut</p>
                    <p className="text-gray-400">Tap the "+" icon to create a new automation</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-military-green flex items-center justify-center text-xs font-bold text-black">3</div>
                  <div>
                    <p className="font-medium">Add Health Sample actions</p>
                    <p className="text-gray-400">Search for "Find Health Samples" and add for Steps, Heart Rate, Workouts</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-military-green flex items-center justify-center text-xs font-bold text-black">4</div>
                  <div>
                    <p className="font-medium">Add "Get Contents of URL" action</p>
                    <div className="bg-gray-800 p-2 rounded mt-1 font-mono text-xs">
                      URL: {setupUrl}
                    </div>
                    <p className="text-gray-400 mt-1">Method: POST, Content-Type: application/json</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-military-green flex items-center justify-center text-xs font-bold text-black">5</div>
                  <div>
                    <p className="font-medium">Set up automation trigger</p>
                    <p className="text-gray-400">Run daily or after workouts for automatic syncing</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(apiKey);
                  toast({ title: "API Key Copied", description: "Your API key has been copied to clipboard" });
                }}
                variant="outline"
                className="border-gray-600 hover:bg-gray-700"
              >
                Copy API Key
              </Button>
              <Button
                onClick={() => {
                  window.open('https://support.apple.com/guide/shortcuts/welcome/ios', '_blank');
                }}
                variant="outline"
                className="border-gray-600 hover:bg-gray-700"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Shortcuts Guide
              </Button>
              <Button
                onClick={() => setShowSetupDialog(false)}
                className="flex-1 bg-military-green hover:bg-military-green/80"
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Workouts Dialog */}
      <Dialog open={showWorkoutsDialog} onOpenChange={setShowWorkoutsDialog}>
        <DialogContent className="max-w-4xl bg-gray-900 border-gray-700 max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center space-x-2">
              <Activity className="h-5 w-5 text-military-green" />
              <span>Apple Health Workouts</span>
              {unconvertedWorkouts.length > 0 && (
                <Badge variant="outline" className="bg-blue-900/20 text-blue-300 border-blue-600/30">
                  {unconvertedWorkouts.length} new
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-3">
            {workouts?.map((workout) => (
              <WorkoutCard
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

function WorkoutCard({ 
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
              {workout.totalDistance && workout.totalDistance !== '0' && (
                <div className="flex items-center space-x-1">
                  <Activity className="h-3 w-3" />
                  <span>{workout.totalDistance}</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(workout.startDate).toLocaleDateString()}</span>
              </div>
            </div>

            {workout.sourceApp && (
              <div className="mt-2 text-xs text-gray-500">
                From: {workout.sourceApp}
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
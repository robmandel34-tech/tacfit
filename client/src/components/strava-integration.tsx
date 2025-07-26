import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Activity, RotateCcw, Link, Unlink, Zap, Copy } from "lucide-react";

export default function StravaIntegration() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showManualFlow, setShowManualFlow] = useState(false);
  const [authCode, setAuthCode] = useState("");

  // Get Strava connection status
  const { data: stravaStatus, isLoading } = useQuery({
    queryKey: ["/api/strava/status", user?.id],
    queryFn: () => fetch(`/api/strava/status?userId=${user?.id}`).then(res => res.json()),
    enabled: !!user?.id,
  });

  // Get Strava auth URL for manual flow
  const getAuthUrl = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/strava/auth?userId=${user?.id}`);
      return response.json();
    },
    onSuccess: (data) => {
      setShowManualFlow(true);
      // Create a clickable link instead of automatic popup
      const authWindow = window.open(data.authUrl, '_blank', 'width=600,height=700,scrollbars=yes');
      if (!authWindow) {
        toast({
          title: "Popup Blocked",
          description: "Please allow popups and try again, or manually copy the authorization link",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Strava Authorization Opened",
          description: "Complete authorization in the new window, then copy the code from the error page",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to generate Strava auth URL",
        variant: "destructive",
      });
    },
  });

  // Exchange authorization code
  const exchangeCode = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/strava/exchange-code", { 
        userId: user?.id, 
        code 
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/strava/status", user?.id] });
      setShowManualFlow(false);
      setAuthCode("");
      toast({
        title: "Connected Successfully",
        description: `Connected to Strava (Athlete ID: ${data.athleteId})`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Invalid authorization code",
        variant: "destructive",
      });
    },
  });

  // Disconnect from Strava
  const disconnectStrava = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/strava/disconnect", { userId: user?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strava/status", user?.id] });
      toast({
        title: "Disconnected",
        description: "Successfully disconnected from Strava",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Disconnection Failed",
        description: error.message || "Failed to disconnect from Strava",
        variant: "destructive",
      });
    },
  });

  // Sync Strava activities
  const syncActivities = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/strava/sync", { userId: user?.id });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Sync Complete",
        description: `Synced ${data.syncedCount} activities from Strava`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync Strava activities",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Strava Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-military-green border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const isConnected = stravaStatus?.isConnected;
  const tokenExpired = stravaStatus?.tokenExpired;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-orange-500" />
          Strava Integration
        </CardTitle>
        <CardDescription>
          Connect your Strava account to automatically sync your fitness activities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <div className="font-medium">Connection Status</div>
              <div className="text-gray-500">
                {isConnected ? "Connected to Strava" : "Not connected"}
              </div>
            </div>
            <Badge 
              variant={isConnected ? (tokenExpired ? "destructive" : "default") : "secondary"}
              className={isConnected ? (tokenExpired ? "" : "bg-green-100 text-green-800") : ""}
            >
              {isConnected ? (tokenExpired ? "Token Expired" : "Connected") : "Disconnected"}
            </Badge>
          </div>
        </div>

        {isConnected && stravaStatus?.athleteId && (
          <div className="text-sm text-gray-600">
            <strong>Athlete ID:</strong> {stravaStatus.athleteId}
          </div>
        )}

        {!isConnected && showManualFlow && (
          <div className="space-y-4 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-orange-800 dark:text-orange-200">Manual Strava Connection</Label>
              
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <p className="font-medium">Step 1: Authorize TacFit on Strava</p>
                <p>1. A new window should have opened with Strava authorization</p>
                <p>2. Click "Authorize" to grant TacFit access to your activities</p>
                <p>3. You'll see an error page - this is normal!</p>
                
                <p className="font-medium mt-3">Step 2: Copy the Authorization Code</p>
                <p>4. From the error page URL, copy the code after "code=" (before "&")</p>
                <p>5. Paste it in the field below and click Connect</p>
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Paste authorization code here..."
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={() => exchangeCode.mutate(authCode)}
                  disabled={!authCode.trim() || exchangeCode.isPending}
                  className="bg-military-green hover:bg-military-green-light text-white"
                >
                  {exchangeCode.isPending ? "Connecting..." : "Connect"}
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowManualFlow(false)}
                className="text-gray-600"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!isConnected ? (
            <>
              <Button 
                onClick={() => getAuthUrl.mutate()}
                disabled={getAuthUrl.isPending || showManualFlow}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Link className="h-4 w-4 mr-2" />
                {getAuthUrl.isPending ? "Opening..." : "Connect with Strava"}
              </Button>
              {showManualFlow && (
                <p className="text-sm text-gray-600 mt-2">
                  Authorization window opened. Follow the steps above to complete connection.
                </p>
              )}
            </>
          ) : (
            <>
              <Button 
                onClick={() => syncActivities.mutate()}
                disabled={syncActivities.isPending || tokenExpired}
                className="bg-military-green hover:bg-military-green-light text-white"
              >
                <Zap className="h-4 w-4 mr-2" />
                {syncActivities.isPending ? "Syncing..." : "Sync Activities"}
              </Button>
              
              <Button 
                onClick={() => disconnectStrava.mutate()}
                disabled={disconnectStrava.isPending}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <Unlink className="h-4 w-4 mr-2" />
                {disconnectStrava.isPending ? "Disconnecting..." : "Disconnect"}
              </Button>
            </>
          )}
        </div>

        {tokenExpired && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-800 text-sm">
              <RotateCcw className="h-4 w-4" />
              <div>
                <div className="font-medium">Token Expired</div>
                <div>Please reconnect to Strava to continue syncing activities</div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-50 border rounded-lg p-4 text-sm text-gray-600">
          <div className="font-medium mb-2">How it works:</div>
          <ul className="space-y-1 list-disc list-inside">
            <li>Connect your Strava account securely</li>
            <li>Your activities from the last 30 days will be synced</li>
            <li>Activities automatically map to TacFit activity types</li>
            <li>Each synced activity earns 15 base points</li>
            <li>You must be in a competition to sync activities</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
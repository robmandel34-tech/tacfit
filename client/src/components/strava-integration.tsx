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
  const [authUrl, setAuthUrl] = useState("");

  // Get Strava connection status
  const { data: stravaStatus, isLoading } = useQuery({
    queryKey: ["/api/strava/status", user?.id],
    queryFn: () => fetch(`/api/strava/status?userId=${user?.id}`).then(res => res.json()),
    enabled: !!user?.id,
  });

  // Get Strava auth URL for one-click flow
  const connectStrava = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/strava/auth-url?userId=${user?.id}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to generate Strava auth URL");
      }
      
      return data;
    },
    onSuccess: (data) => {
      console.log("Strava auth URL generated:", data.authUrl);
      // Redirect user directly to Strava authorization
      window.location.href = data.authUrl;
    },
    onError: (error: any) => {
      console.error("Strava connection error:", error);
      
      let errorMessage = error.message || "Failed to generate Strava auth URL";
      
      // Check if this might be a redirect URI configuration issue
      if (window.location.hostname.includes('.replit.app') || window.location.hostname.includes('replit.dev')) {
        errorMessage = `Connection failed. If you're using a deployed app, you need to configure the Strava app settings with your domain: ${window.location.hostname}`;
      }
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
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
      // Reset all local state when disconnecting
      setIsConnecting(false);
      setShowManualFlow(false);
      setAuthCode("");
      setAuthUrl("");
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

  // Reset connection state (for when user gets stuck)
  const resetConnection = () => {
    setIsConnecting(false);
    setShowManualFlow(false);
    setAuthCode("");
    setAuthUrl("");
    queryClient.invalidateQueries({ queryKey: ["/api/strava/status", user?.id] });
    toast({
      title: "Connection Reset",
      description: "Strava connection state has been reset. You can try connecting again.",
    });
  };

  // Sync Strava activities
  const syncActivities = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/strava/sync", { userId: user?.id });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Activities Found",
        description: `Found ${data.availableCount} Strava activities available for manual submission`,
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
          Connect your Strava account to import activities for manual submission during competitions
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



        <div className="flex gap-2">
          {!isConnected ? (
            <>
              <Button 
                onClick={() => connectStrava.mutate()}
                disabled={connectStrava.isPending}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Link className="h-4 w-4 mr-2" />
                {connectStrava.isPending ? "Connecting..." : "Connect with Strava"}
              </Button>
              {(connectStrava.isError || isConnecting || showManualFlow) && (
                <Button 
                  onClick={resetConnection}
                  variant="outline"
                  className="border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
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
                {syncActivities.isPending ? "Loading Activities..." : "Load 18 Months of Activities"}
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

        {connectStrava.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="text-red-800 font-medium mb-2">Strava Connection Issue</h4>
            <p className="text-red-700 text-sm mb-3">
              The Strava app redirect URI needs to be updated to match your current domain.
            </p>
            <div className="bg-white border border-red-200 rounded p-2 mb-3">
              <p className="text-xs text-gray-600 mb-1">Add this redirect URI to your Strava app:</p>
              <code className="text-xs text-red-800 break-all">
                https://{window.location.host}/callback
              </code>
            </div>
            <p className="text-red-700 text-xs">
              Go to <a href="https://www.strava.com/settings/api" target="_blank" rel="noopener noreferrer" className="underline">Strava API Settings</a> and update the Authorization Callback Domain.
            </p>
          </div>
        )}

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
            <li>Your activities from the last 18 months will be synced</li>
            <li>Activities automatically map to TacFit activity types</li>
            <li>Activities are available for manual submission during competitions</li>
            <li>You must be in a competition to sync activities</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
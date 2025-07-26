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

  // Get Strava auth URL for manual flow
  const getAuthUrl = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/strava/auth?userId=${user?.id}`);
      return response.json();
    },
    onSuccess: (data) => {
      setShowManualFlow(true);
      setAuthUrl(data.authUrl);
      toast({
        title: "Ready to Connect",
        description: "Click the Strava authorization link below to complete the connection",
      });
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
              <Label className="text-sm font-medium text-orange-800 dark:text-orange-200">Strava Connection Steps</Label>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="font-medium text-sm text-gray-800 dark:text-gray-200">Step 1: Click to Authorize</p>
                  <Button
                    asChild
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <a href={authUrl} target="_blank" rel="noopener noreferrer">
                      <Link className="h-4 w-4 mr-2" />
                      Open Strava Authorization
                    </a>
                  </Button>
                </div>
                
                <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded border border-blue-200 dark:border-blue-800">
                    <p className="font-medium text-blue-800 dark:text-blue-200">Step 2: Get Your Authorization Code</p>
                    <div className="mt-2 space-y-1">
                      <p>1. Click the orange "Open Strava Authorization" button above</p>
                      <p>2. Click "Authorize" on the Strava page</p>
                      <p>3. You'll be redirected to an error page - <strong>this is normal!</strong></p>
                      <p>4. Look at the URL in your browser's address bar</p>
                      <p>5. Find the part that looks like: <code className="bg-gray-200 px-1 rounded">code=abc123xyz...</code></p>
                      <p>6. Copy everything after "code=" (the long string of letters and numbers)</p>
                      <p>7. Paste it in the box below</p>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <strong>Example:</strong> If the URL shows <code>workspace.rmandel20.replit.app/?code=abc123xyz789&state=1</code><br/>
                    Copy: <code>abc123xyz789</code>
                  </div>
                </div>
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
                onClick={() => {
                  setShowManualFlow(false);
                  setAuthUrl("");
                  setAuthCode("");
                }}
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
                  Follow the steps above to complete Strava connection.
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
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  getHealthKitScopes,
  isHealthKitAvailable,
  readRecentWorkouts,
  requestHealthKitAuthorization,
} from "@/lib/healthkit";

// Auto re-sync cadence while the app is connected and foregrounded (~7 min).
const SYNC_INTERVAL_MS = 7 * 60 * 1000;

interface AppleHealthStatus {
  connected: boolean;
  lastSyncedAt: string | null;
  scopes: string[];
}

export function useAppleHealth() {
  const native = isHealthKitAvailable();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  const { data: status, isLoading } = useQuery<AppleHealthStatus>({
    queryKey: ["/api/apple-health/status"],
    enabled: native,
  });

  const connected = !!status?.connected;

  // Reads device workouts and pushes them to the backend.
  const syncNow = useCallback(
    async (silent = false): Promise<number> => {
      if (!native || syncingRef.current) return 0;
      syncingRef.current = true;
      setIsSyncing(true);
      try {
        const workouts = await readRecentWorkouts(30);
        const res = await apiRequest("POST", "/api/apple-health/sync", { workouts });
        const data = await res.json();
        await queryClient.invalidateQueries({ queryKey: ["/api/apple-health/status"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/apple-health/workouts"] });
        if (!silent) {
          toast({
            title: "Apple Health synced",
            description: `${data.synced ?? workouts.length} workouts updated.`,
          });
        }
        return data.synced ?? workouts.length;
      } catch (e: any) {
        if (!silent) {
          toast({
            title: "Sync failed",
            description: e?.message || "Could not read Apple Health.",
            variant: "destructive",
          });
        }
        return 0;
      } finally {
        syncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [native, queryClient, toast],
  );

  const connectMutation = useMutation({
    mutationFn: async () => {
      const ok = await requestHealthKitAuthorization();
      if (!ok) throw new Error("Apple Health is not available on this device.");
      await apiRequest("POST", "/api/apple-health/connect", { scopes: getHealthKitScopes() });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/apple-health/status"] });
      await syncNow(true);
      toast({
        title: "Apple Health connected",
        description: "Your workouts will sync automatically.",
      });
    },
    onError: (e: any) => {
      toast({
        title: "Couldn't connect",
        description: e?.message || "Apple Health connection failed.",
        variant: "destructive",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/apple-health/disconnect");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/apple-health/status"] });
      toast({ title: "Apple Health disconnected" });
    },
  });

  // Auto re-sync on an interval while connected, native, and foregrounded.
  useEffect(() => {
    if (!native || !connected) return;
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void syncNow(true);
    };
    const id = window.setInterval(tick, SYNC_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncNow(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [native, connected, syncNow]);

  return {
    native,
    isLoading,
    connected,
    lastSyncedAt: status?.lastSyncedAt ?? null,
    scopes: status?.scopes ?? [],
    connect: () => connectMutation.mutate(),
    disconnect: () => disconnectMutation.mutate(),
    refresh: () => syncNow(false),
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    isSyncing,
  };
}

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  getHealthKitScopes,
  hasLatestHealthKitScopes,
  isHealthKitAvailable,
  readDailyHealthMetrics,
  readRecentMindfulSessions,
  readRecentWorkouts,
  requestHealthKitAuthorization,
} from "@/lib/healthkit";

// Auto re-sync cadence while the app is connected and foregrounded (~7 min).
const SYNC_INTERVAL_MS = 7 * 60 * 1000;

// Module-level (shared by every useAppleHealth instance — FAB, Log Activity
// modal, Settings) so the one-time re-authorization sheet is requested once
// and concurrent callers await the same result instead of racing.
let scopesUpgradeInFlight: Promise<boolean> | null = null;

interface AppleHealthStatus {
  connected: boolean;
  lastSyncedAt: string | null;
  scopes: string[];
}

// Passive activity totals for the most recent day, surfaced to the UI.
export interface TodayActivity {
  metricDate: string;
  exerciseMinutes: number | null;
  activeEnergyKcal: number | null;
  distanceMeters: number | null;
}

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useAppleHealth() {
  const native = isHealthKitAvailable();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [todayActivity, setTodayActivity] = useState<TodayActivity | null>(null);
  const syncingRef = useRef(false);
  // A sync requested while one is already running is coalesced into a single
  // follow-up run (instead of being dropped), so e.g. the sync that follows a
  // permission grant can't be lost to an in-progress timer/foreground sync.
  const syncAgainRef = useRef(false);

  const { data: status, isLoading } = useQuery<AppleHealthStatus>({
    queryKey: ["/api/apple-health/status"],
    enabled: native,
  });

  const connected = !!status?.connected;

  // Reads device workouts (plus Mindful Minutes sessions) and pushes them to
  // the backend. Mindful sessions ride along in the same payload — they are
  // stored and claimed exactly like workouts — and a failure reading them
  // never blocks workouts (readRecentMindfulSessions swallows its own errors).
  const syncNow = useCallback(
    async (silent = false): Promise<number> => {
      if (!native) return 0;
      if (syncingRef.current) {
        syncAgainRef.current = true;
        return 0;
      }
      syncingRef.current = true;
      setIsSyncing(true);
      try {
        const recorded = await readRecentWorkouts(30);
        const mindful = await readRecentMindfulSessions(30);
        const workouts = [...recorded, ...mindful];
        const res = await apiRequest("POST", "/api/apple-health/sync", { workouts });
        const data = await res.json();
        await queryClient.invalidateQueries({ queryKey: ["/api/apple-health/status"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/apple-health/workouts"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/apple-health/passive-today"] });

        // Also sync daily readiness metrics (best-effort; never blocks workouts).
        try {
          const metrics = await readDailyHealthMetrics(90);
          if (metrics.length > 0) {
            // Surface the most recent day's passive activity totals to the UI.
            const todayKey = localDayKey(new Date());
            const latest =
              metrics.find((m) => m.metricDate === todayKey) ?? metrics[metrics.length - 1];
            setTodayActivity({
              metricDate: latest.metricDate,
              exerciseMinutes: latest.exerciseMinutes,
              activeEnergyKcal: latest.activeEnergyKcal,
              distanceMeters: latest.distanceMeters,
            });
            await apiRequest("POST", "/api/apple-health/metrics/sync", { metrics });
            // Team readiness uses a single-string key (/api/readiness/team/:id),
            // so match by predicate rather than an exact array prefix.
            await queryClient.invalidateQueries({
              predicate: (q) => String(q.queryKey[0] ?? "").startsWith("/api/readiness"),
            });
          }
        } catch (metricErr) {
          // Don't block workouts (already synced), but log so a failed readiness
          // metrics sync is diagnosable instead of silently disappearing.
          console.warn("Apple Health metrics sync failed:", metricErr);
        }
        if (!silent) {
          const workoutCount = recorded.length;
          const mindfulCount = mindful.length;
          toast({
            title: "Apple Health synced",
            description:
              mindfulCount > 0
                ? `${workoutCount} workout${workoutCount === 1 ? "" : "s"} and ${mindfulCount} meditation session${mindfulCount === 1 ? "" : "s"} updated.`
                : `${data.synced ?? workoutCount} workouts updated.`,
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
        if (syncAgainRef.current) {
          syncAgainRef.current = false;
          void syncNow(true);
        }
      }
    },
    [native, queryClient, toast],
  );

  // One-time re-authorization for users who connected before a new HealthKit
  // read type was added (e.g. Mindful Minutes). iOS only shows the permission
  // sheet for types the user hasn't decided on yet, so this is a single extra
  // prompt. It runs in context (Log Activity screen / Refresh), not at launch.
  // Resolves true when a re-authorization actually happened, so the caller can
  // follow up with a sync that now includes the new data.
  const ensureLatestScopes = useCallback(async (): Promise<boolean> => {
    if (!native || !connected || hasLatestHealthKitScopes()) return false;
    // Another instance (or an earlier call) is already showing the sheet —
    // wait for that result rather than prompting twice or syncing too early.
    if (scopesUpgradeInFlight) return scopesUpgradeInFlight;
    scopesUpgradeInFlight = (async () => {
      try {
        const ok = await requestHealthKitAuthorization(); // marks the scope version current
        if (!ok) return false;
        await apiRequest("POST", "/api/apple-health/connect", { scopes: getHealthKitScopes() });
        await queryClient.invalidateQueries({ queryKey: ["/api/apple-health/status"] });
        return true;
      } catch (e) {
        console.warn("Apple Health re-authorization failed:", e);
        return false;
      } finally {
        scopesUpgradeInFlight = null;
      }
    })();
    return scopesUpgradeInFlight;
  }, [native, connected, queryClient]);

  // Manual "Refresh": pick up any newly added read types first, then sync
  // with a visible result toast.
  const refresh = useCallback(async (): Promise<number> => {
    await ensureLatestScopes();
    return syncNow(false);
  }, [ensureLatestScopes, syncNow]);

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

  // Auto re-sync while connected: immediately on connect/launch, on a timer
  // while foregrounded, and whenever the app returns to the foreground.
  useEffect(() => {
    if (!native || !connected) return;

    // Sync right away so a freshly opened app shows current data without the
    // user having to hit "Refresh".
    void syncNow(true);

    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void syncNow(true);
    };
    const id = window.setInterval(tick, SYNC_INTERVAL_MS);

    // Web fallback (used in the browser / PWA).
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncNow(true);
    };
    document.addEventListener("visibilitychange", onVisible);

    // Native foreground detection. On iOS, the webview's `visibilitychange`
    // event does NOT reliably fire when a Capacitor app returns from the
    // background, and JS timers are paused while backgrounded — so without
    // this listener nothing re-syncs until a manual refresh. The Capacitor
    // App plugin's `appStateChange` fires with isActive=true on every
    // foreground, which is what triggers the automatic refresh.
    let cancelled = false;
    let removeNativeListener: (() => void) | undefined;
    if (native) {
      void (async () => {
        try {
          const { App } = await import("@capacitor/app");
          const handle = await App.addListener("appStateChange", ({ isActive }) => {
            if (isActive) void syncNow(true);
          });
          // If the effect already cleaned up while the import/addListener was
          // resolving, remove the listener immediately so it doesn't leak.
          if (cancelled) {
            void handle.remove();
          } else {
            removeNativeListener = () => {
              void handle.remove();
            };
          }
        } catch (e) {
          console.warn("Apple Health foreground listener unavailable:", e);
        }
      })();
    }

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      removeNativeListener?.();
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
    refresh,
    // Silent variants for in-context housekeeping (no toasts).
    ensureLatestScopes,
    syncSilently: () => syncNow(true),
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    isSyncing,
    todayActivity,
  };
}

import { useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthRequired } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import type { TeamCall } from "@shared/schema";

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

// meet.jit.si and framatalk.org both force the first participant to log in
// before the meeting starts ("waiting for a moderator"). fairmeeting.net
// (run by the fairkom cooperative) is a free public Jitsi server with fully
// anonymous rooms (no authdomain/anonymousdomain split in its config) and no
// iframe-embedding restrictions.
const JITSI_DOMAIN = "fairmeeting.net";
const JITSI_SCRIPT = `https://${JITSI_DOMAIN}/external_api.js`;

export default function Call() {
  const { callId } = useParams();
  const { user, isLoading: authLoading } = useAuthRequired();
  const [, navigate] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: call, isLoading, error } = useQuery<TeamCall>({
    queryKey: [`/api/calls/${callId}`],
    enabled: !!callId,
    retry: false,
  });

  useEffect(() => {
    if (!call?.roomName || !containerRef.current || !user) return;
    let cancelled = false;

    function startJitsi() {
      if (cancelled || !window.JitsiMeetExternalAPI || !containerRef.current) return;
      apiRef.current = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
        roomName: call!.roomName,
        parentNode: containerRef.current,
        lang: "en",
        userInfo: { displayName: user!.username },
        configOverwrite: {
          prejoinPageEnabled: false,
          startWithAudioMuted: true,
          // Legacy flag (older Jitsi versions)
          disableDeepLinking: true,
          // Modern equivalent — fairmeeting.net's own config sets
          // deeplinking.disabled = false, which wins over the legacy flag,
          // so we must override the new-style object too or mobile users get
          // the "How do you want to join this meeting?" app-promo screen.
          deeplinking: { disabled: true },
          defaultLanguage: "en",
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
        },
      });
      apiRef.current.addEventListener("readyToClose", () => {
        navigate("/team");
      });

      // Report presence so teammates can see who's in the call on the Team
      // tab. Heartbeat every 30s; the server treats anyone silent for ~75s
      // as gone, so a killed app drops off on its own.
      const reportPresence = () => {
        apiRequest("POST", `/api/calls/${callId}/presence`).catch(() => {
          /* best-effort; never disturb the call */
        });
      };
      apiRef.current.addEventListener("videoConferenceJoined", () => {
        reportPresence();
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        heartbeatRef.current = setInterval(reportPresence, 30_000);
      });
      apiRef.current.addEventListener("videoConferenceLeft", () => {
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
        apiRequest("DELETE", `/api/calls/${callId}/presence`).catch(() => {});
      });
    }

    if (window.JitsiMeetExternalAPI) {
      startJitsi();
    } else {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${JITSI_SCRIPT}"]`);
      if (existing) {
        existing.addEventListener("load", startJitsi, { once: true });
      } else {
        const script = document.createElement("script");
        script.src = JITSI_SCRIPT;
        script.async = true;
        script.onload = startJitsi;
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      apiRequest("DELETE", `/api/calls/${callId}/presence`).catch(() => {});
      try {
        apiRef.current?.dispose();
      } catch {
        /* no-op */
      }
      apiRef.current = null;
    };
  }, [call?.roomName, user, navigate, callId]);

  const leave = () => navigate("/team");

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 bg-black/70 px-4 py-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={leave}
          className="text-white hover:bg-white/10"
          data-testid="button-leave-call"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Leave
        </Button>
        <span className="text-white text-sm font-semibold truncate">
          {call?.title || "Team call"}
        </span>
      </div>

      {(authLoading || isLoading) && (
        <div className="flex h-full items-center justify-center text-white">
          Connecting to your team call...
        </div>
      )}

      {error && (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-white">
          <p>This call isn't available. It may have been cancelled, or you may not be on this team.</p>
          <Button onClick={leave} className="bg-green-700 hover:bg-green-600">
            Back to Team
          </Button>
        </div>
      )}

      <div ref={containerRef} className="h-full w-full pt-10" data-testid="jitsi-container" />
    </div>
  );
}

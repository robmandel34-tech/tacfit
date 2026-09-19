import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuthRequired } from "@/lib/auth";
import { apiRequest, uploadUrl } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Share2, Download, Lock, Loader2 } from "lucide-react";
import type { CompetitionRecapSummary, CompetitionRecapUserStats } from "@shared/schema";
import { renderRecapCard, canvasToPngBlob } from "@/lib/recap-card-image";

interface RecapResponse {
  id: number;
  competitionId: number;
  createdAt: string;
  summary: CompetitionRecapSummary;
  userStats: CompetitionRecapUserStats | null;
  userStatsHidden: boolean;
  viewerParticipated: boolean;
  // Live photo + motto per team (older responses may omit it).
  teamProfiles?: { teamId: number; motto: string | null; pictureUrl: string | null }[];
}

// The shareable end-of-competition "momento" card. The image is pre-rendered
// as soon as the recap loads so that tapping Share can call navigator.share()
// synchronously inside the tap — iOS refuses to open the share sheet otherwise.
export default function CompetitionCardPage() {
  const { user } = useAuthRequired();
  const params = useParams<{ competitionId: string; userId?: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const competitionId = parseInt(params.competitionId);
  const requestedUserId = params.userId ? parseInt(params.userId) : undefined;

  const { data: recap, isLoading, error } = useQuery<RecapResponse>({
    queryKey: [`/api/competitions/${competitionId}/recap`, requestedUserId ?? "me"],
    queryFn: async () => {
      const qs = requestedUserId ? `?userId=${requestedUserId}` : "";
      const res = await apiRequest("GET", `/api/competitions/${competitionId}/recap${qs}`);
      return res.json();
    },
    enabled: !!user && Number.isFinite(competitionId),
    retry: false,
  });

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => {
    if (!recap) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setImageUrl(null);
    setRenderError(null);
    blobRef.current = null;
    (async () => {
      try {
        // The featured team is the viewer's own on a personal card, the winner
        // on a public one — the same choice the renderer makes.
        const featuredTeamId = recap.userStats?.teamId ?? recap.summary.standings[0]?.teamId ?? null;
        const profile = recap.teamProfiles?.find((t) => t.teamId === featuredTeamId) ?? null;
        const canvas = await renderRecapCard({
          summary: recap.summary,
          userStats: recap.userStats,
          teamProfile: profile
            ? { motto: profile.motto, pictureUrl: profile.pictureUrl ? uploadUrl(profile.pictureUrl) : null }
            : null,
        });
        const blob = await canvasToPngBlob(canvas);
        if (cancelled) return;
        blobRef.current = blob;
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch (err: any) {
        if (!cancelled) setRenderError(err?.message || "Could not render the card");
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [recap]);

  const fileName = useMemo(() => {
    const slug = (recap?.summary.name || "competition").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return `muster-up-${slug || "competition"}-recap.png`;
  }, [recap?.summary.name]);

  const shareText = recap
    ? recap.userStats
      ? `${recap.summary.name} is done — ${recap.userStats.activityCount} activities and ${recap.userStats.points} points with ${recap.userStats.teamName}. Muster Up!`
      : `${recap.summary.name} is done${recap.summary.winner ? ` — ${recap.summary.winner.name} took it` : ""}. Muster Up!`
    : "";

  const handleShare = () => {
    const blob = blobRef.current;
    if (!blob) {
      toast({ title: "Still rendering", description: "Give the card a second to finish, then try again." });
      return;
    }
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
    const file = new File([blob], fileName, { type: "image/png" });
    const withFile: ShareData = { files: [file], title: `${recap?.summary.name} recap`, text: shareText };

    if (typeof nav.share === "function" && (!nav.canShare || nav.canShare(withFile))) {
      // Called synchronously from the tap so iOS opens the share sheet.
      nav.share(withFile).catch((err: any) => {
        if (err?.name !== "AbortError") {
          toast({ title: "Couldn't share", description: err?.message || "Try saving the image instead.", variant: "destructive" });
        }
      });
      return;
    }
    if (typeof nav.share === "function") {
      nav.share({ title: `${recap?.summary.name} recap`, text: shareText, url: window.location.href }).catch(() => {});
      return;
    }
    toast({
      title: "Sharing isn't available here",
      description: "Use Save image, or long-press the card to share it.",
    });
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const status = (error as any)?.message as string | undefined;

  return (
    <div className="min-h-screen backdrop-blur-md bg-white/5">
      <Navigation />
      <main className="container mx-auto px-4 py-6 max-w-xl">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => (window.history.length > 1 ? window.history.back() : setLocation("/"))}
            className="text-gray-300 hover:text-white hover:bg-white/10 px-2"
            data-testid="button-recap-back"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-white font-semibold">Momento card</h1>
          <div className="w-16" />
        </div>

        {isLoading && (
          <Card className="tile-card">
            <CardContent className="py-16 text-center text-gray-300">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3" />
              Loading recap…
            </CardContent>
          </Card>
        )}

        {!isLoading && !recap && (
          <Card className="tile-card">
            <CardContent className="py-12 text-center">
              <p className="text-white font-semibold mb-1">No card for this competition yet</p>
              <p className="text-gray-400 text-sm">
                {status?.includes("403") || status?.toLowerCase().includes("private")
                  ? "This competition was private."
                  : "Cards are created when a competition finishes."}
              </p>
            </CardContent>
          </Card>
        )}

        {recap && (
          <div className="space-y-4">
            {recap.userStatsHidden && (
              <div className="flex items-center gap-2 rounded-lg bg-surface-overlay px-4 py-3 text-sm text-gray-300">
                <Lock className="h-4 w-4 text-gray-400 shrink-0" />
                This athlete keeps their stats private, so the card shows team and overall results only.
              </div>
            )}

            <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#181B14] shadow-2xl aspect-[4/5]">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={`${recap.summary.name} recap card`}
                  className="w-full h-full object-contain"
                  data-testid="img-recap-card"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                  {renderError ? renderError : (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Rendering card…</span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleShare}
                disabled={!imageUrl}
                className="bg-military-green hover:bg-military-green/80 text-forest-green font-semibold"
                data-testid="button-share-recap-card"
              >
                <Share2 className="h-4 w-4 mr-2" /> Share
              </Button>
              <Button
                onClick={handleDownload}
                disabled={!imageUrl}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
                data-testid="button-save-recap-card"
              >
                <Download className="h-4 w-4 mr-2" /> Save image
              </Button>
            </div>
            <p className="text-center text-gray-500 text-xs">
              Share opens your device's share sheet — send it in iMessage, post it, or save it to Photos.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

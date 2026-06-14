import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { isGoogleAvailable, isAppleAvailable } from "@/lib/sso";

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.42 2.21-1.12 3-.78.88-2.05 1.56-3.1 1.48-.13-1.1.46-2.27 1.13-3.02.76-.86 2.1-1.5 3.09-1.46zM20.5 17.04c-.55 1.27-.82 1.84-1.53 2.96-.99 1.57-2.39 3.53-4.12 3.54-1.54.02-1.94-1-4.03-.99-2.09.01-2.53 1.01-4.07.99-1.73-.02-3.05-1.78-4.04-3.35C-.02 16.9-.32 11.59 1.69 8.86c1.02-1.4 2.62-2.28 4.13-2.28 1.54 0 2.5.99 3.78.99 1.24 0 1.99-.99 3.78-.99 1.35 0 2.78.74 3.8 2.01-3.34 1.83-2.8 6.6.32 8.45z" />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}

// Apple/Google sign-in buttons shared by the Login and Register screens.
// Only renders the providers that are configured (so nothing shows until the
// matching client ids are set), and hides entirely if neither is available.
export function SsoButtons() {
  const { loginWithGoogle, loginWithApple } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [pending, setPending] = useState<null | "google" | "apple">(null);

  const googleOn = isGoogleAvailable();
  const appleOn = isAppleAvailable();
  if (!googleOn && !appleOn) return null;

  const run = async (provider: "google" | "apple", fn: () => Promise<void>) => {
    setPending(provider);
    try {
      await fn();
      toast({
        title: "Access granted",
        description: "Welcome, operator.",
      });
      // Defer navigation a tick so auth state propagates before the route guard runs.
      setTimeout(() => setLocation("/"), 50);
    } catch (error: any) {
      const msg: string = error?.message || "";
      // Don't show a scary error if the user simply dismissed the sign-in sheet.
      const cancelled = /cancel|dismiss|closed|popup_closed|1001|user_cancelled/i.test(
        msg,
      );
      if (!cancelled) {
        toast({
          title: "Sign-in failed",
          description: msg || "Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border-subtle" />
        <span className="text-xs uppercase tracking-wider text-muted">or</span>
        <div className="h-px flex-1 bg-border-subtle" />
      </div>

      {appleOn && (
        <Button
          type="button"
          onClick={() => run("apple", loginWithApple)}
          disabled={pending !== null}
          className="w-full bg-black text-white hover:bg-black/80 border border-white/20 py-3 text-base font-semibold flex items-center justify-center gap-2"
        >
          <AppleLogo />
          {pending === "apple" ? "Signing in..." : "Continue with Apple"}
        </Button>
      )}

      {googleOn && (
        <Button
          type="button"
          onClick={() => run("google", loginWithGoogle)}
          disabled={pending !== null}
          className="w-full bg-white text-gray-800 hover:bg-gray-100 py-3 text-base font-semibold flex items-center justify-center gap-2"
        >
          <GoogleLogo />
          {pending === "google" ? "Signing in..." : "Continue with Google"}
        </Button>
      )}
    </div>
  );
}

// Client-side Sign in with Apple / Google.
//
// Uses @capgo/capacitor-social-login, which presents the NATIVE sign-in sheet
// on iOS and falls back to the providers' web SDKs (Google Identity Services /
// Apple JS) in a browser — one code path for both. Each provider hands us a
// signed identity token (idToken) which we forward to our backend to verify.

import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";

const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as
  | string
  | undefined;
const GOOGLE_IOS_CLIENT_ID = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID as
  | string
  | undefined;
const APPLE_SERVICES_ID = import.meta.env.VITE_APPLE_SERVICES_ID as
  | string
  | undefined;
const APPLE_REDIRECT_URI = import.meta.env.VITE_APPLE_REDIRECT_URI as
  | string
  | undefined;

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

// Google: native iOS needs an iOS client id (the web client id alone cannot
// drive the native sign-in / reversed-client-id URL scheme). Web needs a web
// client id. This keeps the button hidden where it would fail.
export function isGoogleAvailable(): boolean {
  return isNative() ? !!GOOGLE_IOS_CLIENT_ID : !!GOOGLE_WEB_CLIENT_ID;
}

// Apple: always available on native iOS (built in). On web it needs a Services ID.
export function isAppleAvailable(): boolean {
  return isNative()
    ? Capacitor.getPlatform() === "ios"
    : !!APPLE_SERVICES_ID;
}

let initPromise: Promise<void> | null = null;
function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = SocialLogin.initialize({
      google:
        GOOGLE_WEB_CLIENT_ID || GOOGLE_IOS_CLIENT_ID
          ? {
              webClientId: GOOGLE_WEB_CLIENT_ID,
              iOSClientId: GOOGLE_IOS_CLIENT_ID,
            }
          : undefined,
      apple: APPLE_SERVICES_ID
        ? { clientId: APPLE_SERVICES_ID, redirectUrl: APPLE_REDIRECT_URI }
        : undefined,
    }).catch((e) => {
      // Allow a later retry if initialization failed (e.g. SDK script blocked).
      initPromise = null;
      throw e;
    });
  }
  return initPromise;
}

export async function signInWithGoogle(): Promise<{ idToken: string }> {
  await ensureInitialized();
  const res = await SocialLogin.login({
    provider: "google",
    options: { scopes: ["email", "profile"] },
  });
  const result = res.result as { idToken?: string | null };
  if (!result?.idToken) {
    throw new Error("Google did not return an identity token.");
  }
  return { idToken: result.idToken };
}

export async function signInWithApple(): Promise<{
  idToken: string;
  fullName?: string;
}> {
  await ensureInitialized();
  const res = await SocialLogin.login({
    provider: "apple",
    options: { scopes: ["email", "name"] },
  });
  const result = res.result as {
    idToken?: string | null;
    profile?: { givenName?: string | null; familyName?: string | null };
  };
  if (!result?.idToken) {
    throw new Error("Apple did not return an identity token.");
  }
  const fullName =
    [result.profile?.givenName, result.profile?.familyName]
      .filter(Boolean)
      .join(" ") || undefined;
  return { idToken: result.idToken, fullName };
}

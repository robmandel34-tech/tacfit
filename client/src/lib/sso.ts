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

// Apple config for SocialLogin.initialize().
//
// Native iOS: the plugin's iOS `initialize` rejects with "No provider was
// initialized" unless an `apple` object is present, and
// `login({ provider: "apple" })` is then never reached. The OS-level flow
// ignores clientId (the token audience is always the app's bundle id); the
// plugin only uses its presence to know Apple should be enabled — so ALWAYS
// pass a block on iOS. Never pass redirectUrl on iOS: that switches the plugin
// into its separate redirect/backend exchange flow instead of the direct
// ASAuthorization flow our server expects.
//
// Web: the web implementation ignores `apple` without a clientId, and the
// button is hidden there unless VITE_APPLE_SERVICES_ID is set.
const IOS_BUNDLE_ID = "com.tacfit.app"; // must match capacitor.config appId

function appleInitOptions():
  | { clientId?: string; redirectUrl?: string }
  | undefined {
  if (isNative() && Capacitor.getPlatform() === "ios") {
    return { clientId: IOS_BUNDLE_ID };
  }
  return APPLE_SERVICES_ID
    ? { clientId: APPLE_SERVICES_ID, redirectUrl: APPLE_REDIRECT_URI }
    : undefined;
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
      apple: appleInitOptions(),
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
    accessToken?: { token?: string | null } | null;
    profile?: { givenName?: string | null; familyName?: string | null };
  };
  // @capgo/capacitor-social-login (v6) misnames Apple's fields on BOTH iOS
  // and web: `idToken` holds the short-lived AUTHORIZATION CODE, while the
  // identity token (the JWT our backend verifies against Apple's JWKS) is in
  // `accessToken.token`. Pick whichever field actually contains a JWT so a
  // future plugin version that fixes the naming keeps working.
  const idToken = [result?.accessToken?.token, result?.idToken].find(isJwt);
  if (!idToken) {
    throw new Error("Apple did not return an identity token.");
  }
  const fullName =
    [result.profile?.givenName, result.profile?.familyName]
      .filter(Boolean)
      .join(" ") || undefined;
  return { idToken, fullName };
}

// A JWT is three non-empty base64url segments; Apple's authorization code is a
// single opaque string, so this cleanly tells the two apart.
function isJwt(value: string | null | undefined): value is string {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)
  );
}

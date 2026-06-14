// Server-side verification of Sign in with Apple / Google identity tokens.
//
// Both providers hand the client a signed identity token (a JWT). The client
// sends it to us and we verify the signature against the provider's public keys
// and check the audience (our app's client id) before trusting the contents.
// No provider "secret" is needed for verification — only the public client ids.

import { OAuth2Client } from "google-auth-library";
import { createRemoteJWKSet, jwtVerify } from "jose";

export interface SsoIdentity {
  providerId: string; // stable unique id for the user from the provider (the "sub")
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}

// ---- Google -------------------------------------------------------------

// Accept any of our configured Google client ids as a valid audience:
// the web client id (browser) and the iOS client id (native app) differ.
function googleAudiences(): string[] {
  return [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.VITE_GOOGLE_CLIENT_ID,
  ].filter((v): v is string => !!v && v.trim().length > 0);
}

let googleClient: OAuth2Client | null = null;

export function isGoogleConfigured(): boolean {
  return googleAudiences().length > 0;
}

export async function verifyGoogleIdToken(idToken: string): Promise<SsoIdentity> {
  const audiences = googleAudiences();
  if (audiences.length === 0) {
    throw new Error("Google sign-in is not configured on the server.");
  }
  if (!googleClient) googleClient = new OAuth2Client();

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: audiences,
  });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub) {
    throw new Error("Invalid Google token.");
  }
  return {
    providerId: payload.sub,
    email: payload.email ?? null,
    emailVerified: payload.email_verified === true,
    name: payload.name ?? null,
  };
}

// ---- Apple --------------------------------------------------------------

const appleJwks = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys"),
);

// Native app audience is the bundle id; web audience is the Services ID.
function appleAudiences(): string[] {
  return [
    process.env.APPLE_BUNDLE_ID || "com.tacfit.app",
    process.env.APPLE_SERVICES_ID,
  ].filter((v): v is string => !!v && v.trim().length > 0);
}

export function isAppleConfigured(): boolean {
  return appleAudiences().length > 0;
}

export async function verifyAppleIdToken(idToken: string): Promise<SsoIdentity> {
  const audiences = appleAudiences();
  const { payload } = await jwtVerify(idToken, appleJwks, {
    issuer: "https://appleid.apple.com",
    audience: audiences,
  });
  if (!payload.sub) {
    throw new Error("Invalid Apple token.");
  }
  const email = typeof payload.email === "string" ? payload.email : null;
  // Apple sends email_verified as the string "true"/"false" or a boolean.
  const ev = (payload as Record<string, unknown>).email_verified;
  const emailVerified = ev === true || ev === "true";
  return {
    providerId: payload.sub,
    email,
    emailVerified,
    name: null, // Apple only sends the name in the authorization response, not the token
  };
}

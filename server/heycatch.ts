import { analytics } from "@heycatch/sdk";
import type { HeyCatchPersonProperties } from "@heycatch/sdk";

// HeyCatch product analytics — the server door.
//
// The browser SDK (initialised in client/src/main.tsx) autocaptures pageviews,
// clicks and route changes. The server only reports the business outcomes it
// alone can vouch for: a verified sign-up, a finished onboarding, a logged
// activity, a team join, a competition entry. Server calls resolve once ingest
// has answered and never throw, so they are awaited inline before responding.
//
// The project key is publishable, so it is inlined rather than plumbed
// through an environment variable. Same key as the browser side.
analytics.init({ projectKey: "hck_pk_RFfvs65QXI_qS_mc3FXOTVjeL_du86XB" });

export const heycatch = analytics;

interface IdentifiableUser {
  id: number;
  email?: string | null;
  username?: string | null;
  createdAt?: Date | string | null;
}

// The stable id that joins browser and server events: the numeric users.id,
// stringified. The browser side (client/src/lib/analytics.ts) uses the same.
export function heycatchUserId(user: { id: number }): string {
  return String(user.id);
}

// Who performed an outcome. Prefer the authenticated user (cookie session or
// the bearer bridge that hydrates req.session for the native app); fall back
// to the id the route itself acted on for legacy callers that only send it in
// the body. The browser identifies with the session user, so this is what
// keeps server events on the same person.
export function analyticsActor(
  req: { session?: { userId?: number; user?: { id?: number } } },
  fallbackId: number,
): { id: number } {
  const sessionUserId = req.session?.userId ?? req.session?.user?.id;
  return { id: typeof sessionUserId === "number" ? sessionUserId : fallbackId };
}

// Person properties in the dashboard's canonical keys. `signup_date` goes in
// the set-once slot so a later sign-in can never move it.
export function heycatchPersonProps(user: IdentifiableUser): {
  set: HeyCatchPersonProperties;
  setOnce: HeyCatchPersonProperties;
} {
  const set: HeyCatchPersonProperties = {};
  if (user.email) set.email = user.email;
  if (user.username) set.name = user.username;
  const setOnce: HeyCatchPersonProperties = {};
  if (user.createdAt) {
    const created = new Date(user.createdAt);
    if (!Number.isNaN(created.getTime())) setOnce.signup_date = created.toISOString();
  }
  return { set, setOnce };
}

// Identify a user from the server, for outcomes that happen before the browser
// has had a chance to (e.g. email verification, which precedes first login).
export async function identifyUserOnServer(user: IdentifiableUser): Promise<void> {
  const { set, setOnce } = heycatchPersonProps(user);
  await analytics.setIdentity(heycatchUserId(user), set, setOnce);
}

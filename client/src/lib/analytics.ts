import posthog from "posthog-js";
import { analytics as heycatch } from "@heycatch/sdk";

// Two analytics destinations share these wrappers:
//  - HeyCatch (initialised in main.tsx) — always on; identity is linked here.
//  - PostHog — optional, only when VITE_POSTHOG_KEY is configured.

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
  "https://us.i.posthog.com";

let posthogInitialized = false;

export function initAnalytics(): void {
  if (posthogInitialized) return;
  if (!POSTHOG_KEY) {
    // No key configured — PostHog is simply off. The app runs normally.
    return;
  }
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    autocapture: true,
  });
  posthogInitialized = true;
}

export function identifyUser(user: {
  id: number;
  username: string;
  email: string;
  isAdmin?: boolean;
  createdAt?: string | Date | null;
}): void {
  // Identity is the stable numeric user id (stringified) — the same value the
  // server passes as userId, which is what joins browser and server events.
  // signup_date is set-once so a later sign-in can never move it.
  const signupDate = user.createdAt ? new Date(user.createdAt) : null;
  heycatch.setIdentity(
    String(user.id),
    { email: user.email, name: user.username },
    signupDate && !Number.isNaN(signupDate.getTime())
      ? { signup_date: signupDate.toISOString() }
      : undefined,
  );

  if (!posthogInitialized) return;
  posthog.identify(String(user.id), {
    username: user.username,
    email: user.email,
    is_admin: !!user.isAdmin,
  });
}

export function resetAnalytics(): void {
  heycatch.resetIdentity();
  if (!posthogInitialized) return;
  posthog.reset();
}

export function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (!posthogInitialized) return;
  posthog.capture(event, properties);
}

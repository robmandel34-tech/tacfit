import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
  "https://us.i.posthog.com";

let initialized = false;

export function initAnalytics(): void {
  if (initialized) return;
  if (!POSTHOG_KEY) {
    // No key configured — analytics is simply off. The app runs normally.
    return;
  }
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    autocapture: true,
  });
  initialized = true;
}

export function identifyUser(user: {
  id: number;
  username: string;
  email: string;
  isAdmin?: boolean;
}): void {
  if (!initialized) return;
  posthog.identify(String(user.id), {
    username: user.username,
    email: user.email,
    is_admin: !!user.isAdmin,
  });
}

export function resetAnalytics(): void {
  if (!initialized) return;
  posthog.reset();
}

export function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (!initialized) return;
  posthog.capture(event, properties);
}

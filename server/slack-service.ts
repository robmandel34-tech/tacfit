// Slack notifier — posts admin alerts via Replit's managed Slack connection.
// Uses the @replit/connectors-sdk proxy, which injects the OAuth token and
// handles refresh automatically. See the Replit "slack" connector blueprint.
//
// Fire-and-forget: never blocks or breaks the request that triggered it, and
// no-ops cleanly if Slack isn't connected — so the app always runs normally.

import { ReplitConnectors } from "@replit/connectors-sdk";

// Default channel (#tacfit). Used for anything without a dedicated channel.
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID || "C0B6ZLUAYRJ";

// Alert categories can each route to their own channel. If a category's env
// var isn't set, that category falls back to the default channel — so the app
// keeps working out of the box and you can split channels whenever you like.
export type SlackCategory =
  | "general"
  | "signups"
  | "activity"
  | "firstActivity"
  | "invites"
  | "nudges"
  | "onboarding"
  | "issues";

function channelFor(category: SlackCategory): string {
  switch (category) {
    case "signups":
      return process.env.SLACK_CHANNEL_SIGNUPS || SLACK_CHANNEL_ID;
    case "activity":
      return process.env.SLACK_CHANNEL_ACTIVITY || SLACK_CHANNEL_ID;
    case "firstActivity":
      return process.env.SLACK_CHANNEL_FIRST_ACTIVITY || SLACK_CHANNEL_ID;
    case "invites":
      return process.env.SLACK_CHANNEL_INVITES || SLACK_CHANNEL_ID;
    case "nudges":
      return process.env.SLACK_CHANNEL_NUDGES || SLACK_CHANNEL_ID;
    case "onboarding":
      return process.env.SLACK_CHANNEL_ONBOARDING || SLACK_CHANNEL_ID;
    case "issues":
      return process.env.SLACK_CHANNEL_ISSUES || SLACK_CHANNEL_ID;
    default:
      return SLACK_CHANNEL_ID;
  }
}

const connectors = new ReplitConnectors();

// Avoid log spam: once Slack starts failing (e.g. bot not invited to the
// channel, or no connection), stop logging every event. We log the first few
// failures so the problem is visible, then go quiet until the next success.
let consecutiveFailures = 0;
const MAX_LOGGED_FAILURES = 3;

function logFailure(detail: string): void {
  consecutiveFailures += 1;
  if (consecutiveFailures <= MAX_LOGGED_FAILURES) {
    console.error(`Slack notification failed: ${detail}`);
    if (consecutiveFailures === MAX_LOGGED_FAILURES) {
      console.error("Slack notifications: silencing further failures until next success.");
    }
  }
}

/**
 * Send a message to a Slack channel by category (defaults to the general
 * channel). Swallows all errors — a Slack outage must never affect the
 * user's action.
 */
export function notifySlack(text: string, category: SlackCategory = "general"): void {
  const channel = channelFor(category);
  // Intentionally not awaited by callers — runs in the background.
  void (async () => {
    try {
      const resp = await connectors.proxy("slack", "/chat.postMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, text }),
      });
      const data: any = await resp.json().catch(() => ({ ok: false, error: `HTTP ${resp.status}` }));
      if (data.ok) {
        consecutiveFailures = 0;
      } else {
        logFailure(data.error || "unknown error");
      }
    } catch (err) {
      logFailure(err instanceof Error ? err.message : String(err));
    }
  })();
}

// Throttle bug/issue alerts: identical errors can fire in bursts, so we only
// post the same message once per window to avoid flooding the issues channel.
const ISSUE_THROTTLE_MS = 5 * 60 * 1000;
const recentIssues = new Map<string, number>();

/**
 * Report an app error/bug to the issues channel (throttled by message).
 */
export function notifyIssue(text: string): void {
  const now = Date.now();
  const last = recentIssues.get(text) || 0;
  if (now - last < ISSUE_THROTTLE_MS) return;
  recentIssues.set(text, now);
  // Keep the map bounded: drop expired entries, then hard-cap the size by
  // evicting the oldest so bursty high-cardinality errors can't grow memory.
  if (recentIssues.size > 200) {
    for (const [k, t] of recentIssues) {
      if (now - t > ISSUE_THROTTLE_MS) recentIssues.delete(k);
    }
    while (recentIssues.size > 200) {
      const oldestKey = recentIssues.keys().next().value;
      if (oldestKey === undefined) break;
      recentIssues.delete(oldestKey);
    }
  }
  notifySlack(text, "issues");
}

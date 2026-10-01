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
//
// Channel settings live in .replit under [userenv.shared] (SLACK_CHANNEL_*),
// so they are versioned with the code and can't silently disappear.
export type SlackCategory =
  | "general"
  | "signups"
  | "activity"
  | "firstActivity"
  | "invites"
  | "nudges"
  | "onboarding"
  | "issues"
  | "summary";

export const SLACK_CATEGORIES: SlackCategory[] = [
  "general",
  "signups",
  "activity",
  "firstActivity",
  "invites",
  "nudges",
  "onboarding",
  "issues",
  "summary",
];

export function channelFor(category: SlackCategory): string {
  switch (category) {
    case "signups":
      return process.env.SLACK_CHANNEL_SIGNUPS || SLACK_CHANNEL_ID;
    case "activity":
      return process.env.SLACK_CHANNEL_ACTIVITY || SLACK_CHANNEL_ID;
    case "firstActivity":
      // First-activity milestones sit naturally next to sign-ups.
      return process.env.SLACK_CHANNEL_FIRST_ACTIVITY || channelFor("signups");
    case "invites":
      return process.env.SLACK_CHANNEL_INVITES || SLACK_CHANNEL_ID;
    case "nudges":
      // The "who needs a nudge" list is engagement detail — it belongs with
      // the summaries unless given its own channel.
      return process.env.SLACK_CHANNEL_NUDGES || channelFor("summary");
    case "onboarding":
      return process.env.SLACK_CHANNEL_ONBOARDING || SLACK_CHANNEL_ID;
    case "issues":
      return process.env.SLACK_CHANNEL_ISSUES || SLACK_CHANNEL_ID;
    case "summary":
      return process.env.SLACK_CHANNEL_SUMMARY || SLACK_CHANNEL_ID;
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

export interface SlackSendResult {
  ok: boolean;
  channel: string;
  error?: string;
}

// Slack truncates chat.postMessage text past 40k characters (and long
// messages are hard to read anyway). Keep well under that so a report with an
// unexpectedly long list degrades to a visibly trimmed message, not a dropped
// tail.
const MAX_TEXT_CHARS = 12000;

function clampText(text: string): string {
  if (text.length <= MAX_TEXT_CHARS) return text;
  return `${text.slice(0, MAX_TEXT_CHARS - 20)}\n_…(truncated)_`;
}

// A hung proxy call must not stall a digest run or an admin request forever.
const SEND_TIMEOUT_MS = 15 * 1000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/**
 * Post a message to a Slack channel and report the outcome. Never throws.
 * Use this when the caller needs to know whether the post landed (digest
 * runs, channel tests); use notifySlack() for fire-and-forget alerts.
 */
export async function sendSlack(
  text: string,
  category: SlackCategory = "general",
): Promise<SlackSendResult> {
  const channel = channelFor(category);
  try {
    const data: any = await withTimeout(
      (async () => {
        const resp = await connectors.proxy("slack", "/chat.postMessage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel, text: clampText(text) }),
          signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        } as RequestInit);
        return resp.json().catch(() => ({ ok: false, error: `HTTP ${resp.status}` }));
      })(),
      SEND_TIMEOUT_MS + 1000,
    );
    if (data.ok) {
      consecutiveFailures = 0;
      return { ok: true, channel };
    }
    const error = String(data.error || "unknown error");
    logFailure(`${error} (category=${category}, channel=${channel})`);
    return { ok: false, channel, error };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logFailure(`${error} (category=${category}, channel=${channel})`);
    return { ok: false, channel, error };
  }
}

/**
 * Send a message to a Slack channel by category (defaults to the general
 * channel). Swallows all errors — a Slack outage must never affect the
 * user's action.
 */
export function notifySlack(text: string, category: SlackCategory = "general"): void {
  // Intentionally not awaited by callers — runs in the background.
  void sendSlack(text, category);
}

/**
 * Post a short test message to every distinct channel the categories route
 * to, and report which ones Slack accepted. Lets an admin verify the channel
 * setup (bot invited, IDs valid) instead of guessing from silence.
 */
export async function testSlackChannels(): Promise<
  Array<{ channel: string; categories: SlackCategory[]; ok: boolean; error?: string }>
> {
  const byChannel = new Map<string, SlackCategory[]>();
  for (const category of SLACK_CATEGORIES) {
    const channel = channelFor(category);
    byChannel.set(channel, [...(byChannel.get(channel) || []), category]);
  }
  const results = [];
  for (const [channel, categories] of byChannel) {
    const result = await sendSlack(
      `🔧 Muster Up Slack check — this channel receives: ${categories.join(", ")}.`,
      categories[0],
    );
    results.push({ channel, categories, ok: result.ok, error: result.error });
  }
  return results;
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

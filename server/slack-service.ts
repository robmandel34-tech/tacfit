// Slack notifier — posts admin alerts via Replit's managed Slack connection.
// Uses the @replit/connectors-sdk proxy, which injects the OAuth token and
// handles refresh automatically. See the Replit "slack" connector blueprint.
//
// Fire-and-forget: never blocks or breaks the request that triggered it, and
// no-ops cleanly if Slack isn't connected — so the app always runs normally.

import { ReplitConnectors } from "@replit/connectors-sdk";

// Channel to post alerts into. Defaults to #tacfit; override with SLACK_CHANNEL_ID.
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID || "C0B6ZLUAYRJ";

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
 * Send a message to the configured Slack channel.
 * Swallows all errors — a Slack outage must never affect the user's action.
 */
export function notifySlack(text: string): void {
  // Intentionally not awaited by callers — runs in the background.
  void (async () => {
    try {
      const resp = await connectors.proxy("slack", "/chat.postMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: SLACK_CHANNEL_ID, text }),
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

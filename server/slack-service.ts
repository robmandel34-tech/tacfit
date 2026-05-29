// Lightweight Slack notifier using an Incoming Webhook.
// Fire-and-forget: never blocks or breaks the request that triggered it.
// No-op when SLACK_WEBHOOK_URL is not configured, so the app runs normally.

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

export function isSlackEnabled(): boolean {
  return !!SLACK_WEBHOOK_URL;
}

/**
 * Send a message to the configured Slack channel.
 * Swallows all errors — a Slack outage must never affect the user's action.
 */
export function notifySlack(text: string): void {
  if (!SLACK_WEBHOOK_URL) return;
  // Intentionally not awaited by callers — runs in the background.
  void (async () => {
    try {
      await fetch(SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
    } catch (err) {
      console.error("Slack notification failed:", err);
    }
  })();
}

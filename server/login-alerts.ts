// Slack alerts for sign-ins and return visits.
//
// Two events are reported to the "logins" category:
//   🔑 Login — a user authenticated (password, Apple or Google). New accounts
//      are not reported here; the sign-up alert already covers them.
//   👋 Back in the app — an already-signed-in user came back on a later day.
//      Both the web and native clients send a bearer token on every request,
//      so a token being used for the first time on a new calendar day (app
//      timezone) means the user opened the app again.
//
// Admin accounts are skipped so the founder's own testing doesn't flood the
// channel. Intended as a short-term aid while the user base is small; remove
// the two call sites in routes.ts (or route "logins" to a muted channel) to
// turn it off.

import { sql } from "drizzle-orm";
import { db } from "./db";
import { notifySlack } from "./slack-service";
import { formatLocalShort, localDaysBetween } from "./app-timezone";

export type LoginMethod = "password" | "apple" | "google";

const METHOD_LABEL: Record<LoginMethod, string> = {
  password: "email & password",
  apple: "Apple",
  google: "Google",
};

interface AlertableUser {
  username: string;
  isAdmin?: boolean | null;
  isSuspended?: boolean | null;
}

/** Report a successful sign-in by an existing account. Never throws. */
export function notifyLogin(user: AlertableUser, method: LoginMethod): void {
  if (user.isAdmin || user.isSuspended) return;
  notifySlack(`🔑 *Login* — ${user.username} (${METHOD_LABEL[method]})`, "logins");
}

function describeGap(prev: Date, now: Date): string {
  const days = localDaysBetween(prev, now);
  const when = formatLocalShort(prev);
  if (days <= 1) return `${when} (yesterday)`;
  return `${when} (${days} days ago)`;
}

/**
 * Bump a bearer token's last_used_at and, if this is the token's first use
 * on a new day, post a "back in the app" alert. Fire-and-forget: adds no
 * latency to the request and never throws.
 *
 * The previous timestamp is read and replaced in one statement with a row
 * lock, so the burst of parallel requests an app launch produces (or two
 * server instances) yields exactly one alert: the first statement sees the
 * old value, every later one sees today's.
 */
export function touchAuthToken(token: string): void {
  void (async () => {
    const res: any = await db.execute(sql`
      WITH prev AS (
        SELECT token, user_id, last_used_at
        FROM auth_tokens WHERE token = ${token} FOR UPDATE
      ), upd AS (
        UPDATE auth_tokens t
        SET last_used_at = now() AT TIME ZONE 'UTC'
        FROM prev WHERE t.token = prev.token
        RETURNING prev.user_id, prev.last_used_at
      )
      SELECT user_id, extract(epoch FROM last_used_at) * 1000 AS prev_ms FROM upd`);
    const row = res?.rows?.[0];
    if (!row || row.prev_ms == null) return;

    // A token issued by a login starts with last_used_at = creation time
    // (column default), so its first requests fall on the same day and are
    // not reported here — the login itself is reported by notifyLogin.
    const prev = new Date(Number(row.prev_ms));
    const now = new Date();
    if (localDaysBetween(prev, now) < 1) return;

    const userRes: any = await db.execute(sql`
      SELECT username, is_admin, is_suspended FROM users WHERE id = ${row.user_id}`);
    const user = userRes?.rows?.[0];
    if (!user || user.is_admin || user.is_suspended) return;
    notifySlack(`👋 *Back in the app* — ${user.username} · last seen ${describeGap(prev, now)}`, "logins");
  })().catch((err) => {
    // Best effort: a failed touch must never surface to the request.
    console.error("Auth token touch failed:", err instanceof Error ? err.message : err);
  });
}

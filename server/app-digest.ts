// App-wide Slack report — what happened across Muster Up since the last
// report (sign-ups, activity, invites) plus 7-day engagement and a
// disengagement watch-list. Posted on every digest run, with or without a
// live competition; the per-competition digest in digest-service.ts adds
// standings and team detail when one is running.
//
// All reads are plain aggregate SQL so a report never touches app state.

import { sql } from "drizzle-orm";
import { db } from "./db";

// Hours a user gets after sign-up before "never logged anything" counts
// against them; days of silence before an active user is "quiet"; days after
// which a quiet user is counted as lapsed instead of listed.
const NEW_USER_GRACE_HOURS = 72;
const QUIET_AFTER_DAYS = 7;
const LAPSED_AFTER_DAYS = 30;
const ONBOARDING_GRACE_HOURS = 48;
const MAX_NAMES = 12;
const MAX_COMPETITION_LINES = 12;

function rows<T = any>(result: any): T[] {
  return (result?.rows ?? []) as T[];
}

// Timestamps are stored as UTC wall-clock (timestamp without time zone), so a
// cutoff is passed as a UTC string rather than a Date — a Date would be
// serialized with the server's local offset and misread by Postgres.
function utcLiteral(d: Date): string {
  return d.toISOString().replace("T", " ").replace("Z", "");
}

function plural(n: number, word: string, pluralWord?: string): string {
  return `${n} ${n === 1 ? word : pluralWord || `${word}s`}`;
}

function names(list: string[], max = MAX_NAMES): string {
  if (list.length <= max) return list.join(", ");
  return `${list.slice(0, max).join(", ")} +${list.length - max} more`;
}

// Timestamps come back from SQL as epoch milliseconds (see the queries): the
// columns hold UTC wall-clock time with no zone, and a driver-decoded value
// would be misread if the process timezone weren't UTC.
function daysAgo(ms: number | string | null): number {
  if (ms == null) return 0;
  return Math.floor((Date.now() - Number(ms)) / (24 * 60 * 60 * 1000));
}

function formatWindow(hours: number): string {
  if (hours < 1.5) return "the last hour";
  if (hours < 36) return `the last ${Math.round(hours)}h`;
  return `the last ${Math.round(hours / 24)} days`;
}

export interface AppDigestOptions {
  // Start of the "what's new" window — normally the previous report time.
  since: Date;
  // Label for the report heading, e.g. "Thu Oct 1, 1:00 PM CT".
  heading: string;
}

export async function buildAppDigest(opts: AppDigestOptions): Promise<string> {
  const since = utcLiteral(opts.since);
  const windowHours = (Date.now() - opts.since.getTime()) / (60 * 60 * 1000);

  const [
    newUsersRes,
    userTotalsRes,
    newActivityRes,
    engagementRes,
    opensRes,
    socialRes,
    neverActiveRes,
    quietRes,
    lapsedRes,
    onboardingRes,
    competitionsRes,
  ] = await Promise.all([
    db.execute(sql`
      SELECT username,
             coalesce(onboarding_completed, false) AS onboarding_completed,
             CASE WHEN apple_user_id IS NOT NULL THEN 'Apple'
                  WHEN google_user_id IS NOT NULL THEN 'Google'
                  ELSE 'email' END AS method
      FROM users
      WHERE created_at > ${since}::timestamp
      ORDER BY created_at DESC`),
    db.execute(sql`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS new_7d,
             count(*) FILTER (WHERE created_at > now() - interval '30 days')::int AS new_30d
      FROM users
      WHERE coalesce(is_suspended, false) = false`),
    db.execute(sql`
      SELECT u.username,
             count(*)::int AS n,
             coalesce(sum(a.points), 0)::int AS pts,
             count(*) FILTER (WHERE a.from_apple_health)::int AS apple_health,
             count(*) FILTER (WHERE a.is_verified)::int AS verified,
             array_agg(DISTINCT a.type) AS types
      FROM activities a
      JOIN users u ON u.id = a.user_id
      WHERE a.created_at > ${since}::timestamp
      GROUP BY u.username
      ORDER BY n DESC, pts DESC`),
    db.execute(sql`
      SELECT count(DISTINCT user_id) FILTER (WHERE created_at > now() - interval '24 hours')::int AS active_24h,
             count(DISTINCT user_id) FILTER (WHERE created_at > now() - interval '7 days')::int AS active_7d,
             count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS acts_7d,
             count(DISTINCT user_id) FILTER (WHERE created_at > now() - interval '30 days')::int AS active_30d
      FROM activities`),
    db.execute(sql`
      SELECT count(DISTINCT user_id) FILTER (WHERE last_used_at > now() - interval '24 hours')::int AS opened_24h,
             count(DISTINCT user_id) FILTER (WHERE last_used_at > now() - interval '7 days')::int AS opened_7d
      FROM auth_tokens`),
    db.execute(sql`
      SELECT (SELECT count(*) FROM user_invitations WHERE created_at > ${since}::timestamp)::int AS user_invites,
             (SELECT count(*) FROM phone_invitations WHERE created_at > ${since}::timestamp)::int AS phone_invites,
             (SELECT count(*) FROM user_invitations WHERE status = 'pending' AND expires_at > now())::int AS pending_invites,
             (SELECT count(*) FROM friendships WHERE created_at > ${since}::timestamp)::int AS friend_requests,
             (SELECT count(*) FROM friendships WHERE status = 'pending')::int AS pending_friend_requests,
             (SELECT count(*) FROM apple_health_connections WHERE connected)::int AS apple_health_connected,
             (SELECT count(*) FROM apple_health_connections WHERE connected AND created_at > ${since}::timestamp)::int AS apple_health_new`),
    db.execute(sql`
      SELECT u.username, extract(epoch FROM u.created_at) * 1000 AS created_ms
      FROM users u
      WHERE coalesce(u.is_suspended, false) = false
        AND coalesce(u.is_admin, false) = false
        AND u.created_at < now() - make_interval(hours => ${NEW_USER_GRACE_HOURS})
        AND NOT EXISTS (SELECT 1 FROM activities a WHERE a.user_id = u.id)
      ORDER BY u.created_at DESC`),
    db.execute(sql`
      SELECT u.username, extract(epoch FROM max(a.created_at)) * 1000 AS last_ms, count(*)::int AS total
      FROM users u
      JOIN activities a ON a.user_id = u.id
      WHERE coalesce(u.is_suspended, false) = false
      GROUP BY u.id, u.username
      HAVING max(a.created_at) < now() - make_interval(days => ${QUIET_AFTER_DAYS})
         AND max(a.created_at) >= now() - make_interval(days => ${LAPSED_AFTER_DAYS})
      ORDER BY max(a.created_at) DESC`),
    db.execute(sql`
      SELECT count(*)::int AS n FROM (
        SELECT a.user_id
        FROM activities a
        JOIN users u ON u.id = a.user_id
        WHERE coalesce(u.is_suspended, false) = false
        GROUP BY a.user_id
        HAVING max(a.created_at) < now() - make_interval(days => ${LAPSED_AFTER_DAYS})
      ) lapsed`),
    db.execute(sql`
      SELECT username, extract(epoch FROM created_at) * 1000 AS created_ms
      FROM users
      WHERE coalesce(onboarding_completed, false) = false
        AND coalesce(is_suspended, false) = false
        AND coalesce(is_admin, false) = false
        AND created_at < now() - make_interval(hours => ${ONBOARDING_GRACE_HOURS})
      ORDER BY created_at DESC`),
    db.execute(sql`
      SELECT c.id, c.name, c.payment_type, c.entry_fee,
             extract(epoch FROM c.start_date) * 1000 AS start_ms,
             extract(epoch FROM c.end_date) * 1000 AS end_ms,
             coalesce(c.is_completed, false) AS is_completed,
             (SELECT count(*) FROM competition_entries e WHERE e.competition_id = c.id)::int AS entrants,
             (SELECT count(*) FROM teams t WHERE t.competition_id = c.id)::int AS teams,
             (SELECT count(*) FROM competition_entries e
               WHERE e.competition_id = c.id AND e.created_at > ${since}::timestamp)::int AS new_entrants
      FROM competitions c
      WHERE coalesce(c.is_active, true) = true
        AND c.end_date > now() - interval '7 days'
      ORDER BY c.start_date ASC
      LIMIT ${MAX_COMPETITION_LINES + 1}`),
  ]);

  const newUsers = rows(newUsersRes);
  const totals = rows(userTotalsRes)[0] || { total: 0, new_7d: 0, new_30d: 0 };
  const newActivity = rows(newActivityRes);
  const engagement = rows(engagementRes)[0] || { active_24h: 0, active_7d: 0, acts_7d: 0, active_30d: 0 };
  const opens = rows(opensRes)[0] || { opened_24h: 0, opened_7d: 0 };
  const social = rows(socialRes)[0] || {};
  const neverActive = rows(neverActiveRes);
  const quiet = rows(quietRes);
  const lapsed = rows(lapsedRes)[0]?.n ?? 0;
  const onboarding = rows(onboardingRes);
  const comps = rows(competitionsRes);

  const lines: string[] = [];
  lines.push(`*📋 Muster Up report — ${opts.heading}*`);

  // ---- Since the last report ----
  lines.push("");
  lines.push(`*Since the last report (${formatWindow(windowHours)})*`);

  if (newUsers.length === 0) {
    lines.push("• 🟢 Sign-ups: 0");
  } else {
    const list = newUsers.map(
      (u: any) => `${u.username} (${u.method}${u.onboarding_completed ? "" : ", onboarding not finished"})`,
    );
    lines.push(`• 🟢 Sign-ups: ${newUsers.length} — ${names(list, 8)}`);
  }

  const totalActs = newActivity.reduce((s: number, r: any) => s + r.n, 0);
  if (totalActs === 0) {
    lines.push("• 🏋️ Activities logged: 0");
  } else {
    const appleHealth = newActivity.reduce((s: number, r: any) => s + r.apple_health, 0);
    const verified = newActivity.reduce((s: number, r: any) => s + r.verified, 0);
    const sources: string[] = [];
    if (appleHealth) sources.push(`${appleHealth} Apple Health`);
    if (verified) sources.push(`${verified} verified`);
    lines.push(
      `• 🏋️ Activities logged: ${totalActs} by ${plural(newActivity.length, "person", "people")}${sources.length ? ` (${sources.join(", ")})` : ""}`,
    );
    newActivity.slice(0, 8).forEach((r: any) => {
      const types = Array.isArray(r.types) ? r.types.slice(0, 4).join(", ") : "";
      lines.push(`    ◦ ${r.username} — ${plural(r.n, "activity", "activities")} · ${r.pts} pts${types ? ` · ${types}` : ""}`);
    });
    if (newActivity.length > 8) lines.push(`    ◦ +${newActivity.length - 8} more`);
  }

  const inviteCount = (social.user_invites || 0) + (social.phone_invites || 0);
  const socialBits: string[] = [];
  socialBits.push(`✉️ Team invites sent: ${inviteCount}${social.pending_invites ? ` (${social.pending_invites} pending)` : ""}`);
  socialBits.push(`🤝 Friend requests: ${social.friend_requests || 0}${social.pending_friend_requests ? ` (${social.pending_friend_requests} pending)` : ""}`);
  if (social.apple_health_new) socialBits.push(`❤️ New Apple Health connections: ${social.apple_health_new}`);
  lines.push(`• ${socialBits.join(" · ")}`);

  const newEntrants = comps.reduce((s: number, c: any) => s + (c.new_entrants || 0), 0);
  if (newEntrants > 0) {
    const detail = comps
      .filter((c: any) => c.new_entrants > 0)
      .map((c: any) => `${c.name} +${c.new_entrants}`)
      .join(", ");
    lines.push(`• 🏁 Competition entries: ${newEntrants} (${detail})`);
  }

  // ---- Engagement snapshot ----
  lines.push("");
  lines.push("*Engagement*");
  lines.push(
    `• Logged an activity: ${engagement.active_24h} today · ${engagement.active_7d} this week · ${engagement.active_30d} this month (of ${totals.total} members)`,
  );
  lines.push(`• Opened the app: ${opens.opened_24h} today · ${opens.opened_7d} this week`);
  lines.push(
    `• ${plural(engagement.acts_7d, "activity", "activities")} this week · ${totals.new_7d} new members this week, ${totals.new_30d} this month · ${social.apple_health_connected || 0} with Apple Health connected`,
  );

  // ---- Disengagement watch-list ----
  lines.push("");
  lines.push("*⚠️ Disengagement watch*");
  let anyRisk = false;
  if (quiet.length) {
    anyRisk = true;
    const list = quiet.map((r: any) => `${r.username} (${daysAgo(r.last_ms)}d, ${r.total} total)`);
    lines.push(`• Went quiet — active before, nothing in ${QUIET_AFTER_DAYS}+ days: ${names(list)}`);
  }
  const recentNeverActive = neverActive.filter((u: any) => daysAgo(u.created_ms) <= LAPSED_AFTER_DAYS);
  const olderNeverActive = neverActive.length - recentNeverActive.length;
  if (recentNeverActive.length) {
    anyRisk = true;
    const list = recentNeverActive.map((u: any) => `${u.username} (joined ${daysAgo(u.created_ms)}d ago)`);
    lines.push(`• Signed up, never logged an activity: ${names(list)}`);
  }
  if (onboarding.length) {
    anyRisk = true;
    const list = onboarding.map((u: any) => `${u.username} (${daysAgo(u.created_ms)}d)`);
    lines.push(`• Never finished onboarding: ${names(list, 8)}`);
  }
  if (lapsed || olderNeverActive) {
    const bits: string[] = [];
    if (lapsed) bits.push(`${lapsed} lapsed (no activity in ${LAPSED_AFTER_DAYS}+ days)`);
    if (olderNeverActive) bits.push(`${olderNeverActive} inactive since sign-up (${LAPSED_AFTER_DAYS}+ days)`);
    lines.push(`• Long-term: ${bits.join(" · ")}`);
  }
  if (!anyRisk) {
    lines.push("• Nothing new — no recent members have gone quiet.");
  }

  // ---- Competitions ----
  lines.push("");
  lines.push("*🏁 Competitions*");
  if (comps.length === 0) {
    lines.push("• None live or upcoming. _(No standings digest until one starts.)_");
  } else {
    const now = Date.now();
    comps.slice(0, MAX_COMPETITION_LINES).forEach((c: any) => {
      const start = Number(c.start_ms);
      const end = Number(c.end_ms);
      const price = c.payment_type === "free" || !c.entry_fee ? "free" : `$${(c.entry_fee / 100).toFixed(0)}`;
      const who = `${plural(c.entrants, "entrant")} · ${plural(c.teams, "team")} · ${price}`;
      if (c.is_completed || end < now) {
        lines.push(`• ✅ ${c.name} — ended ${daysAgo(c.end_ms)}d ago · ${who}`);
      } else if (start > now) {
        const days = Math.ceil((start - now) / (24 * 60 * 60 * 1000));
        lines.push(`• ⏳ ${c.name} — starts in ${plural(days, "day")} · ${who}`);
      } else {
        const totalDays = Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)));
        const day = Math.min(totalDays, Math.max(1, Math.ceil((now - start) / (24 * 60 * 60 * 1000))));
        lines.push(`• 🔴 ${c.name} — live, day ${day} of ${totalDays} · ${who} _(standings below)_`);
      }
    });
    if (comps.length > MAX_COMPETITION_LINES) lines.push(`• +${comps.length - MAX_COMPETITION_LINES} more`);
  }

  return lines.join("\n");
}

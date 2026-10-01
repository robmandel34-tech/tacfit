// Catch-up scheduler for the Slack digest.
//
// The app is published on Autoscale, where the server is shut down whenever
// nobody is using it, so an in-process cron job only fires if the server
// happens to be awake at the scheduled minute — in practice it almost never
// is. Instead, the schedule is a list of daily "slots" (DIGEST_HOURS in
// DIGEST_TZ) and the last posted slot is stored in the database. On startup
// and every few minutes while awake, the server works out the most recent
// slot that is due; if it hasn't been posted yet it takes a short lease on it
// with a single conditional UPDATE, posts, and then records the slot as done.
// That gives these guarantees:
//   - a slot missed while asleep is posted the first time the server wakes,
//   - two Autoscale instances can never post the same slot twice,
//   - a long sleep posts only the latest slot, never a backlog,
//   - a crash or Slack outage after the lease is taken is retried once the
//     lease expires, instead of the slot being lost.

import { sql } from "drizzle-orm";
import { db } from "./db";
import { runDigest } from "./digest-service";

const JOB = "slack_digest";

// When the digest runs. Comma-separated 24h hours, in DIGEST_TZ.
// Defaults to 8am, 1pm, 8pm Central.
const DIGEST_HOURS = process.env.DIGEST_HOURS || "8,13,20";
const DIGEST_TZ = process.env.DIGEST_TZ || "America/Chicago";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const STARTUP_DELAY_MS = 15 * 1000;
// A lease older than this is treated as abandoned (instance shut down or
// Slack hung) and the slot can be claimed again.
const LEASE_MINUTES = 10;
// "Since the last report" never looks back further than this, even if the
// previous run was long ago.
const MAX_WINDOW_HOURS = 7 * 24;

function parseHours(raw: string): number[] {
  const hours = raw
    .split(",")
    .map((h) => parseInt(h.trim(), 10))
    .filter((h) => Number.isInteger(h) && h >= 0 && h <= 23);
  return [...new Set(hours)].sort((a, b) => a - b);
}

function resolveTimezone(tz: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    console.error(`Invalid digest timezone "${tz}" — falling back to UTC.`);
    return "UTC";
  }
}

const HOURS = parseHours(DIGEST_HOURS);
const TZ = resolveTimezone(DIGEST_TZ);

// Local calendar date + hour for an instant, in the digest timezone.
function localParts(at: Date, tz: string): { y: number; m: number; d: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || "0", 10);
  return { y: get("year"), m: get("month"), d: get("day"), hour: get("hour") % 24 };
}

function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Key ("YYYY-MM-DD HH" in the digest timezone) of the most recent schedule
 * slot at or before `at`. Keys sort chronologically as plain strings, which
 * is all the claim query needs.
 */
export function currentSlotKey(at: Date = new Date(), hours: number[] = HOURS, tz: string = TZ): string {
  const { y, m, d, hour } = localParts(at, tz);
  const dueToday = hours.filter((h) => h <= hour);
  if (dueToday.length > 0) {
    return `${dateKey(y, m, d)} ${String(dueToday[dueToday.length - 1]).padStart(2, "0")}`;
  }
  // Nothing due yet today → yesterday's last slot. Step back one calendar
  // day on the local date itself so DST days can't skew the result.
  const yesterday = new Date(Date.UTC(y, m - 1, d) - 24 * 60 * 60 * 1000);
  const yKey = dateKey(yesterday.getUTCFullYear(), yesterday.getUTCMonth() + 1, yesterday.getUTCDate());
  return `${yKey} ${String(hours[hours.length - 1]).padStart(2, "0")}`;
}

export function digestHeading(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(at);
}

// Start of the "since the last report" window: the previous successful run,
// capped so a first run or a long gap doesn't dump weeks of history into one
// message.
export function reportWindowStart(lastRunAt: Date | null, now: Date = new Date()): Date {
  const floor = new Date(now.getTime() - MAX_WINDOW_HOURS * 60 * 60 * 1000);
  const fallback = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (!lastRunAt) return fallback;
  return lastRunAt < floor ? floor : lastRunAt;
}

// Timestamps are read back as epoch milliseconds (computed in SQL) rather
// than as timestamp values: the columns hold UTC wall-clock time with no zone,
// and a driver-decoded value would be misread if the process TZ weren't UTC.
async function readJobState(): Promise<{ lastSlotKey: string | null; lastRunAt: Date | null }> {
  const res: any = await db.execute(sql`
    SELECT last_slot_key, extract(epoch FROM last_run_at) * 1000 AS last_run_ms
    FROM scheduled_job_runs WHERE job = ${JOB}`);
  const row = res?.rows?.[0];
  return {
    lastSlotKey: row?.last_slot_key ?? null,
    lastRunAt: row?.last_run_ms != null ? new Date(Number(row.last_run_ms)) : null,
  };
}

export async function getLastDigestRunAt(): Promise<Date | null> {
  try {
    return (await readJobState()).lastRunAt;
  } catch {
    return null;
  }
}

let rowEnsured = false;

async function ensureJobRow(): Promise<void> {
  if (rowEnsured) return;
  await db.execute(sql`INSERT INTO scheduled_job_runs (job) VALUES (${JOB}) ON CONFLICT (job) DO NOTHING`);
  rowEnsured = true;
}

// Take a lease on `slotKey` if it hasn't been posted yet and nobody else holds
// a live lease on it. Exactly one caller wins, even across instances, because
// the UPDATE is conditional. Returns the previous successful run time (the
// start of the report window) when the lease was granted.
async function claimSlot(slotKey: string): Promise<{ granted: boolean; lastRunAt: Date | null }> {
  const res: any = await db.execute(sql`
    WITH prev AS (
      SELECT extract(epoch FROM last_run_at) * 1000 AS last_run_ms
      FROM scheduled_job_runs WHERE job = ${JOB}
    )
    UPDATE scheduled_job_runs
    SET claimed_slot_key = ${slotKey}, claimed_at = now(), updated_at = now()
    WHERE job = ${JOB}
      AND (last_slot_key IS NULL OR last_slot_key < ${slotKey})
      AND (claimed_slot_key IS DISTINCT FROM ${slotKey}
           OR claimed_at IS NULL
           OR claimed_at < now() - make_interval(mins => ${LEASE_MINUTES}))
    RETURNING (SELECT last_run_ms FROM prev) AS last_run_ms`);
  const row = res?.rows?.[0];
  if (!row) return { granted: false, lastRunAt: null };
  return {
    granted: true,
    lastRunAt: row.last_run_ms != null ? new Date(Number(row.last_run_ms)) : null,
  };
}

// Record the slot as posted. Only the lease holder can complete it.
async function completeSlot(slotKey: string): Promise<void> {
  await db.execute(sql`
    UPDATE scheduled_job_runs
    SET last_slot_key = ${slotKey}, last_run_at = now(),
        claimed_slot_key = NULL, claimed_at = NULL, updated_at = now()
    WHERE job = ${JOB} AND claimed_slot_key = ${slotKey}`);
}

let checking = false;

async function checkAndRun(): Promise<void> {
  if (checking) return;
  checking = true;
  try {
    await ensureJobRow();
    const slotKey = currentSlotKey();
    const state = await readJobState();
    if (state.lastSlotKey && state.lastSlotKey >= slotKey) return;

    const claim = await claimSlot(slotKey);
    if (!claim.granted) return;

    const now = new Date();
    const since = reportWindowStart(claim.lastRunAt, now);
    console.log(`Digest: posting slot ${slotKey} ${TZ} (window since ${since.toISOString()}).`);
    const result = await runDigest({ since, heading: digestHeading(now) });

    if (result.posted > 0) {
      // Something landed in Slack: the slot is done. Partial failures are
      // logged rather than retried, so a retry can't double-post the parts
      // that succeeded.
      await completeSlot(slotKey);
      console.log(
        `Digest: posted ${result.posted} message(s) for ${result.competitions} live competition(s)` +
          (result.failures ? `, ${result.failures} failed` : "") + ".",
      );
    } else {
      // Nothing was delivered — leave the lease so the slot is retried once
      // it expires (next check after LEASE_MINUTES).
      console.error(
        `Digest: slot ${slotKey} not delivered (${result.failures} failure(s)); will retry in ${LEASE_MINUTES} min.`,
      );
    }
  } catch (err) {
    console.error("Digest scheduler check failed:", err);
  } finally {
    checking = false;
  }
}

/**
 * Start the catch-up scheduler. Safe to call on every server start; all
 * errors are caught so the scheduler can never crash the server, and a
 * failed check (e.g. database briefly unavailable) is simply retried on the
 * next tick.
 */
export function startDigestScheduler(): void {
  if (HOURS.length === 0) {
    console.error(`Invalid DIGEST_HOURS "${DIGEST_HOURS}" — digest scheduler not started.`);
    return;
  }
  console.log(`Digest scheduled at hours [${HOURS.join(",")}] ${TZ} (catch-up on wake).`);
  setTimeout(() => void checkAndRun(), STARTUP_DELAY_MS).unref();
  setInterval(() => void checkAndRun(), CHECK_INTERVAL_MS).unref();
}

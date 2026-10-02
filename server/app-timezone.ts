// The one timezone the app reports in: Slack digests, "today" boundaries for
// alerts, and human-readable timestamps in admin messages. Configurable via
// DIGEST_TZ; defaults to Central (where the team is).

function resolveTimezone(tz: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    console.error(`Invalid timezone "${tz}" (DIGEST_TZ) — falling back to UTC.`);
    return "UTC";
  }
}

export const APP_TZ = resolveTimezone(process.env.DIGEST_TZ || "America/Chicago");

/** Calendar date ("YYYY-MM-DD") of an instant in the app timezone. */
export function localDayKey(at: Date, tz: string = APP_TZ): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Whole calendar days between two instants in the app timezone (b − a). */
export function localDaysBetween(a: Date, b: Date, tz: string = APP_TZ): number {
  const toUtcMidnight = (key: string) => {
    const [y, m, d] = key.split("-").map((n) => parseInt(n, 10));
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtcMidnight(localDayKey(b, tz)) - toUtcMidnight(localDayKey(a, tz))) / 86_400_000);
}

/** e.g. "Oct 1, 2:00 PM" in the app timezone. */
export function formatLocalShort(at: Date, tz: string = APP_TZ): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(at);
}

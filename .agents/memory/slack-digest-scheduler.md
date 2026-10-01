---
name: Slack digest catch-up scheduler
description: Why the Slack digest/alerts "stopped" on Autoscale, the catch-up slot/lease design that replaced node-cron, and how channel routing is configured.
---

**Rule:** Nothing in this app may rely on an in-process timer firing at a wall-clock time. The deployment is Autoscale (sleeps between requests, restarts dozens of times a day, may run >1 instance), so node-cron almost never fires. Scheduled work must be "catch-up": compute the latest due slot, claim it in the DB with a conditional UPDATE, run, then mark complete.

**Why:** The 3x-daily Slack digest was scheduled with node-cron; production logs showed "digest scheduled" dozens of times/day (constant restarts) and zero digest posts for months. The user read this as "Slack integrations stopped working". Per-event alerts never actually failed — they all landed in the default channel because only `SLACK_CHANNEL_ONBOARDING` was ever configured (other categories fall back to the default #tacfit channel), so the dedicated channels looked dead.

**How to apply:**
- Scheduler = `scheduled_job_runs` row per job: lease (`claimed_slot_key/claimed_at`, 10-min expiry) → run → completed watermark (`last_slot_key/last_run_at`) only when at least one Slack message landed. Total failure keeps the lease so the slot retries after expiry; partial failure is logged, not retried (avoids duplicate posts).
- Slot keys are `"YYYY-MM-DD HH"` strings in `DIGEST_TZ` (default America/Chicago — the user is Central; the old default was New_York) at `DIGEST_HOURS` (default 8,13,20). Only the latest due slot is ever posted (no backlog).
- Scheduler is production-only (`DIGEST_SCHEDULER=on` to enable in dev) because dev shares the real Slack connection — a dev report would land in the real channels.
- Timestamp columns are `timestamp` holding UTC wall-clock. Pass cutoffs as UTC strings (`toISOString()` minus the Z, cast `::timestamp`) and read timestamps back as `extract(epoch ...)*1000`; never trust driver-decoded naive timestamps if the process TZ could be non-UTC.
- Channel routing: `SLACK_CHANNEL_<CATEGORY>` env vars in `.replit` `[userenv.shared]` (non-secret, versioned). `conversations.list` is NOT in the connector's scopes — channel IDs must come from the user; the Replit bot must be /invited to each channel. Verify with `POST /api/admin/slack/test` (posts to every distinct channel and reports Slack's per-channel result).
- The new table reaches production via Publish (Replit-managed DB schema diff on publish) — no self-migration code.

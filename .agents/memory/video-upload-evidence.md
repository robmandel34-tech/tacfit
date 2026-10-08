---
name: Video evidence uploads (direct-to-GCS)
description: Why users "couldn't submit videos" in Oct 2026, how to recognise it in prod logs, and the rules the fixed flow relies on.
---

**Rule 1 — the pre-mutation upload phase must be covered by the busy state.** Videos are PUT straight to GCS *before* the activity mutation starts, so `mutation.isPending` is false the whole time the file is uploading. Any "disabled while submitting" logic must key off a state that is set at the top of the submit handler (plus a synchronous ref lock — two clicks in one tick both pass a state-only guard, verified: 3 programmatic clicks → 3 activities).

**Why:** Oct 2026 a friend of the owner made 16 `POST /api/upload-url` calls in 5 minutes with zero `POST /api/activities`, interleaved with app-foreground bursts, then gave up and posted photos only. The owner himself produced two identical activities 0.4 s apart on web. There was no progress bar during the upload, Submit stayed enabled, and errors were only transient toasts.

**How to recognise it in prod logs:** many `upload-url 200` for one user with no `activities 201` in between = the client never finished the PUT (backgrounded app / re-taps). The 100 MB check happens *before* `upload-url`, so such a user's file was NOT over the limit. GCS CORS from `capacitor://localhost` was verified fine — don't re-investigate storage first.

**Rule 2 — server must verify a pre-uploaded `videoUrl` object exists** (`/uploads/<uuid>.<ext>` shape + `getUploadedFile` lookup) before accepting the activity. Video-only evidence is valid (since 2026-10-08), so without this check a crafted `videoUrl` would mint points with no evidence.

**Rule 3 — no duration limit exists; only size.** Explain the 100 MB cap in minutes (~1–2 min at 1080p) and suggest trimming; don't add a duration limit without the owner asking.

**How to apply:** touching `activity-submission-modal.tsx` submit flow or `/api/activities` evidence validation → keep: ref lock + `isBusy` through upload AND save, progress + status text + inline persistent error (not toast-only), retries with a fresh signed URL (network/5xx only), abort on dialog close, server object-existence check.

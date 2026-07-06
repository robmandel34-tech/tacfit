---
name: /uploads serving & video playback
description: Why uploaded videos show "Video preview unavailable" in production and how /uploads must serve from object storage.
---

# /uploads serving must fall back to object storage

Large videos are uploaded DIRECTLY to GCS (client gets a signed PUT URL; server
just records the `/uploads/<uuid>.mov` path — see the "Video already uploaded
directly to GCS" log). They never touch the local disk. The deployment's local
`uploads/` disk is ALSO ephemeral — wiped on every publish/restart.

**Rule:** the `/uploads/*` route must serve from object storage, not only
`express.static('uploads')`. If it serves local-disk-only, direct-to-GCS videos
(and any file after a redeploy) 404, the client `<video>` fires `onError`, and
the feed shows "Video preview unavailable / Download Video". This is the
recurring ("again") video bug.

**Why:** static-first + GCS fallback keeps legacy local files working while
serving GCS-backed uploads. The `downloadObject` helper already does HTTP Range
(206) support and remaps `.mov`/`quicktime` -> `video/mp4`, which iOS WKWebView
REQUIRES (it refuses to play `video/quicktime` inline, and needs range requests
to seek/play).

**How to apply:** any change to `/uploads` serving must preserve the
object-storage fallback (`getUploadedFile(basename)` -> `downloadObject`) and the
`.mov`->`video/mp4` + `Accept-Ranges` behavior. Use `path.basename(req.path)` to
avoid path traversal.

// Upload limits and accepted media types for activity evidence.
//
// Single source of truth for BOTH sides: the client validates the file as soon
// as it is picked (and shows the limit in plain language), and the server
// gates the signed-URL endpoint with the same lists. Keep them in sync here
// rather than hard-coding numbers in either place.

/** Largest video a user may attach to an activity. */
export const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB

/** Largest single photo a user may attach to an activity. */
export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

/** Maximum number of photos per activity. */
export const MAX_IMAGES_PER_ACTIVITY = 5;

/** Video containers the app can store and play back (iOS WKWebView included). */
export const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".m4v", ".webm"] as const;

/** Image formats accepted for direct-to-storage uploads. */
export const ALLOWED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".heic",
  ".heif",
  ".webp",
] as const;

/**
 * MIME type → extension fallback for video files whose name carries no usable
 * extension (some pickers hand over a bare "video" blob with only a type).
 */
export const VIDEO_MIME_EXTENSIONS: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/x-m4v": ".m4v",
  "video/webm": ".webm",
};

/**
 * Resolve the extension a picked video should be stored under, or null when
 * the file is not a format we accept. Checks the file name first, then the
 * MIME type, so a nameless camera capture of a supported type still passes.
 */
export function videoExtensionFor(file: { name: string; type?: string }): string | null {
  const dot = file.name.lastIndexOf(".");
  const fromName = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
  if ((ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(fromName)) return fromName;
  const fromMime = VIDEO_MIME_EXTENSIONS[(file.type || "").toLowerCase()];
  return fromMime ?? null;
}

/** "85 MB", "1.2 GB", "640 KB" — for user-facing size messages. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 KB";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  if (mb >= 10) return `${Math.round(mb)} MB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** "0:42", "1:05", "12:30" — for user-facing clip lengths. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

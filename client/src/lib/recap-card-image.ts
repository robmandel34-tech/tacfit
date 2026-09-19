import type { CompetitionRecapSummary, CompetitionRecapUserStats } from "@shared/schema";

// Renders the end-of-competition "momento" card to a PNG with Canvas 2D.
//
// The team photo is the centerpiece. It is fetched as a blob and drawn from an
// object URL, so it never taints the canvas (toBlob keeps working on iOS,
// Android and desktop). Everything else is drawn with paths and text — if the
// photo can't be loaded the card still renders with a designed stand-in.

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;

const BG = "#181B14";
const PANEL = "#20241C";
const PANEL_EDGE = "#2C3126";
const TEXT = "#ECE6D6";
const MUTED = "#A8A497";
const OCHRE = "#D2913C";
const SLATE = "#6E93A6";
const GREEN = "#4B6B3A";

const FONT = '"Inter", -apple-system, "Helvetica Neue", Arial, sans-serif';

function font(weight: number, size: number, style: "normal" | "italic" = "normal") {
  return `${style} ${weight} ${size}px ${FONT}`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed.trimEnd()}…`;
}

// Word-wrap into at most `maxLines`. Every emitted line is fitted (so a single
// over-long word can't escape the box) and dropped words end in an ellipsis.
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  let omitted = false;
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines) {
      omitted = true;
      current = "";
      break;
    }
  }
  if (current) {
    if (lines.length < maxLines) lines.push(current);
    else omitted = true;
  }
  if (omitted && lines.length) lines[lines.length - 1] = `${lines[lines.length - 1]}…`;
  return lines.map((line) => fitText(ctx, line, maxWidth));
}

// Letter-spaced small caps, drawn glyph by glyph (canvas has no letterSpacing
// on older WebKit). Returns the rendered width.
function measureSpaced(ctx: CanvasRenderingContext2D, text: string, spacing: number) {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + spacing;
  return Math.max(0, w - spacing);
}

function fillSpaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
}

// The Muster Up brand mark (client/src/assets/muster-mark.svg) drawn as vector
// paths. `size` is the rendered width/height; the source viewBox is 100x100.
function drawBrandMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, ink = TEXT) {
  const s = size / 100;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.translate(-0.35, 2.25);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const baseAlpha = ctx.globalAlpha;
  ctx.globalAlpha = baseAlpha * 0.32;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(49, 64, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = baseAlpha;

  ctx.strokeStyle = ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(17, 76);
  ctx.lineTo(32, 34);
  ctx.lineTo(49, 64);
  ctx.lineTo(67, 20);
  ctx.lineTo(84, 74);
  ctx.stroke();

  const dot = (cx: number, cy: number, r: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };
  dot(17, 76, 2.9, ink);
  dot(84, 74, 2.6, ink);
  dot(32, 34, 3.3, OCHRE);
  dot(67, 20, 3.4, OCHRE);

  ctx.strokeStyle = ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(67, 18);
  ctx.lineTo(67, 2.8);
  ctx.stroke();

  ctx.fillStyle = OCHRE;
  ctx.beginPath();
  ctx.moveTo(67.6, 4.4);
  ctx.lineTo(79.5, 8.6);
  ctx.lineTo(67.6, 12.8);
  ctx.closePath();
  ctx.fill();
  dot(67, 2.6, 2, ink);

  ctx.fillStyle = BG;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(49, 64, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  dot(49, 64, 3.3, SLATE);
  ctx.restore();
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function formatDateRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startText = start.toLocaleDateString(undefined, opts);
  const endText = end.toLocaleDateString(undefined, { ...opts, year: "numeric" });
  return `${startText} – ${endText}`;
}

function formatNumber(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

interface Stat {
  label: string;
  value: string;
  accent?: string;
}

// One panel, N columns separated by hairlines — reads as a single plate
// rather than a row of boxes.
const STAT_BAR_HEIGHT = 116;

function drawStatBar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, stats: Stat[]) {
  ctx.fillStyle = PANEL;
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, width, STAT_BAR_HEIGHT, 20);
  ctx.fill();
  ctx.stroke();

  const colWidth = width / stats.length;
  stats.forEach((stat, i) => {
    const cx = x + colWidth * i + colWidth / 2;
    if (i > 0) {
      ctx.strokeStyle = PANEL_EDGE;
      ctx.beginPath();
      ctx.moveTo(x + colWidth * i, y + 22);
      ctx.lineTo(x + colWidth * i, y + STAT_BAR_HEIGHT - 22);
      ctx.stroke();
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = stat.accent || TEXT;
    ctx.font = font(800, 42);
    ctx.fillText(fitText(ctx, stat.value, colWidth - 28), cx, y + 60);
    ctx.fillStyle = MUTED;
    ctx.font = font(600, 18);
    const label = fitText(ctx, stat.label.toUpperCase(), colWidth - 28);
    ctx.textAlign = "left";
    fillSpaced(ctx, label, cx - measureSpaced(ctx, label, 1.5) / 2, y + 92, 1.5);
  });
  ctx.textAlign = "left";
  return y + STAT_BAR_HEIGHT;
}

function sectionHeading(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, text: string, accent: string) {
  ctx.fillStyle = accent;
  roundRect(ctx, x, y - 22, 8, 30, 4);
  ctx.fill();
  ctx.fillStyle = TEXT;
  ctx.font = font(700, 26);
  ctx.textAlign = "left";
  fillSpaced(ctx, fitText(ctx, text.toUpperCase(), width - 40), x + 24, y + 2, 2);
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + 20);
  ctx.lineTo(x + width, y + 20);
  ctx.stroke();
  return y + 52;
}

interface Photo {
  source: CanvasImageSource;
  width: number;
  height: number;
}

// Team photos are stored as uploaded (no server-side resize), so bound what we
// pull into memory: skip anything over this many bytes, and decode through
// createImageBitmap with a resize hint so browsers that support it decode a
// downsampled bitmap instead of the full-resolution original.
const MAX_PHOTO_BYTES = 30 * 1024 * 1024;
const DECODE_WIDTH = 1600;

// Fetch the team photo as a blob and decode it locally, so the canvas is never
// tainted. Failures (missing file, offline, blocked, too large) resolve to null
// and the card renders with the stand-in instead.
async function loadPhoto(url: string, timeoutMs = 8000): Promise<Photo | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // /uploads is served with `Access-Control-Allow-Origin: *`, so the native
    // app (capacitor://localhost → API host) can fetch it without credentials.
    const res = await fetch(url, { mode: "cors", credentials: "omit", signal: controller.signal });
    if (!res.ok) return null;
    const declared = Number(res.headers.get("content-length") || 0);
    if (declared > MAX_PHOTO_BYTES) return null;
    const blob = await res.blob();
    if (blob.size === 0 || blob.size > MAX_PHOTO_BYTES) return null;
    if (blob.type && !blob.type.startsWith("image/")) return null;

    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(blob, { resizeWidth: DECODE_WIDTH, resizeQuality: "high" });
        if (bitmap.width && bitmap.height) return { source: bitmap, width: bitmap.width, height: bitmap.height };
      } catch {
        // Resize options unsupported or decode refused — fall back below.
      }
    }

    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = objectUrl;
      await img.decode();
      if (!img.naturalWidth || !img.naturalHeight) return null;
      return { source: img, width: img.naturalWidth, height: img.naturalHeight };
    } finally {
      // The decoded bitmap stays valid after the URL is revoked.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function releasePhoto(photo: Photo | null) {
  if (photo && "close" in photo.source && typeof (photo.source as ImageBitmap).close === "function") {
    (photo.source as ImageBitmap).close();
  }
}

// Draw the photo to cover the rect (center crop), like CSS object-fit: cover.
function drawCover(ctx: CanvasRenderingContext2D, photo: Photo, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / photo.width, h / photo.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (photo.width - sw) / 2;
  const sy = (photo.height - sh) / 2;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(photo.source, sx, sy, sw, sh, x, y, w, h);
}

// Stand-in for a team without a photo: a deep field-green gradient with a
// faint contour texture and a large watermark of the brand mark.
function drawPhotoStandIn(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, "#2A3A22");
  grad.addColorStop(0.55, "#1F2A2B");
  grad.addColorStop(1, "#171C18");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = TEXT;
  ctx.lineWidth = 2;
  for (let i = -h; i < w; i += 34) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + h, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.16;
  drawBrandMark(ctx, x + w - 520, y + h / 2 - 160, 380);
  ctx.restore();
}

interface HeroInput {
  label: string;
  teamName: string;
  motto: string | null;
  // Null when there is no team to rank (nobody joined) — no medallion drawn.
  rank: number | null;
  teamCount: number;
  photo: Photo | null;
}

function drawHero(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, hero: HeroInput) {
  const radius = 28;

  // Drop shadow under the photo plate.
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = PANEL;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, w, h, radius);
  ctx.clip();

  if (hero.photo) drawCover(ctx, hero.photo, x, y, w, h);
  else drawPhotoStandIn(ctx, x, y, w, h);

  // Scrims: a light one at the top for the pills, a heavy one at the bottom so
  // the name and motto sit on the photo legibly regardless of its content.
  const top = ctx.createLinearGradient(0, y, 0, y + 170);
  top.addColorStop(0, "rgba(24,27,20,0.55)");
  top.addColorStop(1, "rgba(24,27,20,0)");
  ctx.fillStyle = top;
  ctx.fillRect(x, y, w, 170);

  const bottom = ctx.createLinearGradient(0, y + h * 0.38, 0, y + h);
  bottom.addColorStop(0, "rgba(24,27,20,0)");
  bottom.addColorStop(0.55, "rgba(24,27,20,0.62)");
  bottom.addColorStop(1, "rgba(24,27,20,0.96)");
  ctx.fillStyle = bottom;
  ctx.fillRect(x, y + h * 0.38, w, h * 0.62);

  // Photo-print vignette at the edges.
  const vignette = ctx.createRadialGradient(x + w / 2, y + h / 2, h * 0.35, x + w / 2, y + h / 2, w * 0.75);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = vignette;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  // Frame.
  ctx.strokeStyle = "rgba(236,230,214,0.18)";
  ctx.lineWidth = 2;
  roundRect(ctx, x + 1, y + 1, w - 2, h - 2, radius - 1);
  ctx.stroke();

  const pad = 40;

  // Label pill, top-left.
  ctx.font = font(800, 20);
  const label = hero.label.toUpperCase();
  const labelWidth = measureSpaced(ctx, label, 2.5);
  const pillH = 44;
  const pillW = labelWidth + 44;
  ctx.fillStyle = hero.rank === 1 ? OCHRE : "rgba(236,230,214,0.92)";
  roundRect(ctx, x + pad, y + pad, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = BG;
  ctx.textBaseline = "middle";
  fillSpaced(ctx, label, x + pad + 22, y + pad + pillH / 2 + 1, 2.5);
  ctx.textBaseline = "alphabetic";

  // Rank medallion, top-right.
  if (hero.rank !== null) {
    const medR = 58;
    const medX = x + w - pad - medR;
    const medY = y + pad + medR;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "rgba(24,27,20,0.82)";
    ctx.beginPath();
    ctx.arc(medX, medY, medR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = hero.rank === 1 ? OCHRE : SLATE;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(medX, medY, medR - 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = hero.rank === 1 ? OCHRE : TEXT;
    ctx.font = font(900, 38);
    ctx.fillText(ordinal(hero.rank).toUpperCase(), medX, medY + 6);
    ctx.fillStyle = MUTED;
    ctx.font = font(700, 16);
    fillSpaced(ctx, `OF ${hero.teamCount}`, medX - measureSpaced(ctx, `OF ${hero.teamCount}`, 1.5) / 2, medY + 32, 1.5);
    ctx.textAlign = "left";
  }

  // Name + motto on the photo, bottom-left.
  const textWidth = w - pad * 2;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 2;

  let mottoLines: string[] = [];
  const motto = hero.motto?.trim();
  if (motto) {
    ctx.font = font(600, 34, "italic");
    mottoLines = wrapText(ctx, `“${motto}”`, textWidth - 30, 2);
  }
  const mottoBlock = mottoLines.length ? mottoLines.length * 44 + 14 : 0;
  const nameBaseline = y + h - pad - mottoBlock - 8;

  ctx.fillStyle = TEXT;
  ctx.font = font(800, 56);
  ctx.fillText(fitText(ctx, hero.teamName, textWidth), x + pad, nameBaseline);

  if (mottoLines.length) {
    const firstBaseline = nameBaseline + 56;
    // Ochre rule to the left of the motto, like a stencilled caption.
    ctx.shadowColor = "transparent";
    ctx.fillStyle = OCHRE;
    roundRect(ctx, x + pad, firstBaseline - 30, 6, mottoLines.length * 44 - 6, 3);
    ctx.fill();
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.fillStyle = "rgba(236,230,214,0.94)";
    ctx.font = font(600, 34, "italic");
    mottoLines.forEach((line, i) => ctx.fillText(line, x + pad + 30, firstBaseline + i * 44));
  }
  ctx.restore();
}

export interface RecapTeamProfile {
  motto: string | null;
  pictureUrl: string | null;
}

export interface RecapCardInput {
  summary: CompetitionRecapSummary;
  userStats?: CompetitionRecapUserStats | null;
  // Live team profile (photo + motto) for the featured team, resolved by the
  // caller. Optional so older callers and missing teams still render.
  teamProfile?: RecapTeamProfile | null;
}

export async function renderRecapCard({ summary, userStats, teamProfile }: RecapCardInput): Promise<HTMLCanvasElement> {
  // Kick off the photo fetch while fonts load.
  const photoPromise = teamProfile?.pictureUrl ? loadPhoto(teamProfile.pictureUrl) : Promise.resolve(null);

  // Make sure the brand font is actually available before measuring text.
  try {
    if (document.fonts?.load) {
      await Promise.all([
        document.fonts.load(font(800, 46)),
        document.fonts.load(font(700, 28)),
        document.fonts.load(font(600, 20)),
        document.fonts.load(font(600, 34, "italic")),
      ]);
    }
    await document.fonts?.ready;
  } catch {
    // Fall through to system fonts.
  }
  const photo = await photoPromise;

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not supported in this browser");

  const margin = 72;
  const contentWidth = CARD_WIDTH - margin * 2;

  // Background with a subtle ochre glow in the top-right.
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  const glow = ctx.createRadialGradient(CARD_WIDTH - 120, 80, 20, CARD_WIDTH - 120, 80, 620);
  glow.addColorStop(0, "rgba(210,145,60,0.22)");
  glow.addColorStop(1, "rgba(210,145,60,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Header: mark + wordmark + label
  drawBrandMark(ctx, margin, 56, 96);
  ctx.fillStyle = TEXT;
  ctx.font = font(900, 40);
  ctx.textBaseline = "alphabetic";
  ctx.fillText("MUSTER UP", margin + 116, 104);
  ctx.fillStyle = OCHRE;
  ctx.font = font(700, 20);
  fillSpaced(ctx, "COMPETITION RECAP", margin + 116, 134, 3);

  // Title block: name, then dates and the competition-wide totals in one line.
  let y = 226;
  ctx.fillStyle = TEXT;
  ctx.font = font(800, 56);
  const titleLines = wrapText(ctx, summary.name, contentWidth, 2);
  for (const line of titleLines) {
    ctx.fillText(line, margin, y);
    y += 64;
  }
  ctx.fillStyle = MUTED;
  ctx.font = font(500, 24);
  ctx.fillText(
    fitText(
      ctx,
      `${formatDateRange(summary.startDate, summary.endDate)} · ${summary.durationDays} day${summary.durationDays === 1 ? "" : "s"} · ${formatNumber(summary.teamCount)} ${summary.teamCount === 1 ? "team" : "teams"} · ${formatNumber(summary.participantCount)} ${summary.participantCount === 1 ? "athlete" : "athletes"} · ${formatNumber(summary.activityCount)} activities · ${formatNumber(summary.totalPoints)} pts`,
      contentWidth,
    ),
    margin,
    y - 14,
  );
  y += 30;

  // Featured team: the viewer's team on a personal card, the winner otherwise.
  const team = userStats
    ? summary.standings.find((s) => s.teamId === userStats.teamId)
    : summary.standings[0];
  const showWinnerLine = !!team && team.rank !== 1 && !!summary.winner;
  // Public card: podium when there was a race, otherwise what got logged.
  const standingsRows = !userStats && summary.standings.length > 1 ? Math.min(summary.standings.length, 5) : 0;
  const loggedTotals = [...summary.activityTotals].filter((t) => t.count > 0).sort((a, b) => b.count - a.count);
  const totalsRows = !userStats && !standingsRows ? Math.min(loggedTotals.length, 5) : 0;

  // Size the hero from the bottom up so everything below it always fits.
  const footerLineY = CARD_HEIGHT - 84;
  let below = 0;
  if (team) below += 20 + STAT_BAR_HEIGHT + (showWinnerLine ? 40 : 0);
  if (userStats) below += 56 + 52 + STAT_BAR_HEIGHT + 20 + 40;
  else if (standingsRows) below += 56 + 52 + standingsRows * 44 + 8;
  else if (totalsRows) below += 56 + 52 + totalsRows * 44 + 8;
  const heroHeight = Math.max(400, Math.min(560, footerLineY - 44 - below - y));

  if (team) {
    drawHero(ctx, margin, y, contentWidth, heroHeight, {
      label: userStats ? (team.rank === 1 ? "Champions" : "Your team") : team.rank === 1 ? "Winners" : "Top team",
      teamName: team.name,
      motto: teamProfile?.motto ?? null,
      rank: team.rank,
      teamCount: summary.teamCount,
      photo,
    });
    y += heroHeight + 20;
    y = drawStatBar(ctx, margin, y, contentWidth, [
      { label: "Team points", value: formatNumber(team.points), accent: SLATE },
      { label: "Goal progress", value: `${team.progressPercent}%` },
      { label: "Activities", value: formatNumber(team.activityCount) },
      { label: "Members", value: formatNumber(team.memberCount) },
    ]);
    if (showWinnerLine && summary.winner) {
      ctx.fillStyle = MUTED;
      ctx.font = font(500, 22);
      ctx.fillText(fitText(ctx, `Won by ${summary.winner.name} · ${formatNumber(summary.winner.points)} pts`, contentWidth), margin, y + 32);
      y += 40;
    }
  } else {
    // No standings at all (nobody joined) — keep a quiet stand-in plate.
    drawHero(ctx, margin, y, contentWidth, heroHeight, {
      label: "No teams",
      teamName: summary.name,
      motto: null,
      rank: null,
      teamCount: 0,
      photo: null,
    });
    y += heroHeight + 20;
  }

  // Individual
  if (userStats) {
    y += 56;
    y = sectionHeading(ctx, margin, y, contentWidth, userStats.username, GREEN);
    y = drawStatBar(ctx, margin, y, contentWidth, [
      { label: "Activities", value: formatNumber(userStats.activityCount) },
      { label: "Points", value: formatNumber(userStats.points), accent: OCHRE },
      { label: "Active days", value: formatNumber(userStats.activeDays) },
      { label: "Of team pts", value: `${userStats.teamContributionPercent}%` },
    ]);
    ctx.fillStyle = MUTED;
    ctx.font = font(500, 22);
    const bits = [
      ...(userStats.rankInTeam ? [`${ordinal(userStats.rankInTeam)} on the team`] : []),
      `${userStats.verifiedCount} verified`,
      `${userStats.evidenceCount} with evidence`,
    ];
    const topTypes = userStats.byType.slice(0, 2).map((t) => `${t.count}× ${t.displayName}`);
    ctx.fillText(fitText(ctx, [...bits, ...topTypes].join(" · "), contentWidth), margin, y + 34);
    y += 60;
  } else if (standingsRows) {
    // Public card without personal stats: show the podium instead.
    y += 56;
    y = sectionHeading(ctx, margin, y, contentWidth, "Final standings", GREEN);
    const rows = summary.standings.slice(0, standingsRows);
    ctx.font = font(600, 26);
    for (const row of rows) {
      ctx.fillStyle = row.rank === 1 ? OCHRE : TEXT;
      ctx.textAlign = "left";
      ctx.fillText(fitText(ctx, `${row.rank}. ${row.name}`, contentWidth - 220), margin, y + 10);
      ctx.textAlign = "right";
      ctx.fillStyle = MUTED;
      ctx.fillText(`${formatNumber(row.points)} pts`, margin + contentWidth, y + 10);
      y += 44;
    }
    ctx.textAlign = "left";
  } else if (totalsRows) {
    y += 56;
    y = sectionHeading(ctx, margin, y, contentWidth, "What got logged", GREEN);
    const rows = loggedTotals.slice(0, totalsRows);
    ctx.font = font(600, 26);
    for (const row of rows) {
      ctx.fillStyle = TEXT;
      ctx.textAlign = "left";
      ctx.fillText(fitText(ctx, row.displayName, contentWidth - 320), margin, y + 10);
      ctx.textAlign = "right";
      ctx.fillStyle = MUTED;
      const amount = row.totalQuantity > 0 ? ` · ${formatNumber(row.totalQuantity)} ${row.unit}`.trimEnd() : "";
      ctx.fillText(`${formatNumber(row.count)}×${amount}`, margin + contentWidth, y + 10);
      y += 44;
    }
    ctx.textAlign = "left";
  }

  // Footer
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, footerLineY);
  ctx.lineTo(CARD_WIDTH - margin, footerLineY);
  ctx.stroke();
  ctx.fillStyle = MUTED;
  ctx.font = font(600, 22);
  ctx.textAlign = "left";
  ctx.fillText("Show up. Log it. Muster up.", margin, CARD_HEIGHT - 44);
  ctx.textAlign = "right";
  ctx.fillStyle = OCHRE;
  ctx.fillText("joinmuster.com", CARD_WIDTH - margin, CARD_HEIGHT - 44);
  ctx.textAlign = "left";

  releasePhoto(photo);
  return canvas;
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not export the card image"));
    }, "image/png");
  });
}

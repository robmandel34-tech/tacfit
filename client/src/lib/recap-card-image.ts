import type { CompetitionRecapSummary, CompetitionRecapUserStats } from "@shared/schema";

// Renders the end-of-competition "momento" card to a PNG entirely with Canvas
// 2D drawing calls (no external images), so the canvas is never tainted and
// toBlob() works on iOS, Android and desktop alike.

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

function font(weight: number, size: number) {
  return `${weight} ${size}px ${FONT}`;
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

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines) lines[maxLines - 1] = fitText(ctx, lines[maxLines - 1], maxWidth);
  return lines;
}

// The Muster Up brand mark (client/src/assets/muster-mark.svg) drawn as vector
// paths. `size` is the rendered width/height; the source viewBox is 100x100.
function drawBrandMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / 100;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.translate(-0.35, 2.25);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.globalAlpha = 0.32;
  ctx.strokeStyle = TEXT;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(49, 64, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = TEXT;
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
  dot(17, 76, 2.9, TEXT);
  dot(84, 74, 2.6, TEXT);
  dot(32, 34, 3.3, OCHRE);
  dot(67, 20, 3.4, OCHRE);

  ctx.strokeStyle = TEXT;
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
  dot(67, 2.6, 2, TEXT);

  ctx.fillStyle = BG;
  ctx.strokeStyle = TEXT;
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

interface Tile {
  label: string;
  value: string;
  accent?: string;
}

function drawTiles(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, tiles: Tile[], height = 132) {
  const gap = 16;
  const tileWidth = (width - gap * (tiles.length - 1)) / tiles.length;
  tiles.forEach((tile, i) => {
    const tx = x + i * (tileWidth + gap);
    ctx.fillStyle = PANEL;
    ctx.strokeStyle = PANEL_EDGE;
    ctx.lineWidth = 2;
    roundRect(ctx, tx, y, tileWidth, height, 18);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = tile.accent || TEXT;
    ctx.font = font(800, 46);
    ctx.fillText(fitText(ctx, tile.value, tileWidth - 24), tx + tileWidth / 2, y + 66);
    ctx.fillStyle = MUTED;
    ctx.font = font(600, 20);
    ctx.fillText(fitText(ctx, tile.label.toUpperCase(), tileWidth - 24), tx + tileWidth / 2, y + 104);
  });
  ctx.textAlign = "left";
  return y + height;
}

function sectionHeading(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, text: string, accent: string) {
  ctx.fillStyle = accent;
  roundRect(ctx, x, y - 22, 8, 30, 4);
  ctx.fill();
  ctx.fillStyle = TEXT;
  ctx.font = font(700, 28);
  ctx.textAlign = "left";
  ctx.fillText(text.toUpperCase(), x + 24, y + 2);
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + 20);
  ctx.lineTo(x + width, y + 20);
  ctx.stroke();
  return y + 52;
}

export interface RecapCardInput {
  summary: CompetitionRecapSummary;
  userStats?: CompetitionRecapUserStats | null;
}

export async function renderRecapCard({ summary, userStats }: RecapCardInput): Promise<HTMLCanvasElement> {
  // Make sure the brand font is actually available before measuring text.
  try {
    if (document.fonts?.load) {
      await Promise.all([
        document.fonts.load(font(800, 46)),
        document.fonts.load(font(700, 28)),
        document.fonts.load(font(600, 20)),
      ]);
    }
    await document.fonts?.ready;
  } catch {
    // Fall through to system fonts.
  }

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
  ctx.font = font(700, 22);
  ctx.fillText("COMPETITION RECAP", margin + 116, 136);

  // Title block
  let y = 230;
  ctx.fillStyle = TEXT;
  ctx.font = font(800, 60);
  const titleLines = wrapText(ctx, summary.name, contentWidth, 2);
  for (const line of titleLines) {
    ctx.fillText(line, margin, y);
    y += 68;
  }
  ctx.fillStyle = MUTED;
  ctx.font = font(500, 26);
  ctx.fillText(
    `${formatDateRange(summary.startDate, summary.endDate)} · ${summary.durationDays} day${summary.durationDays === 1 ? "" : "s"}`,
    margin,
    y,
  );
  y += 56;

  // Overall
  y = sectionHeading(ctx, margin, y, contentWidth, "Overall", OCHRE);
  y = drawTiles(ctx, margin, y, contentWidth, [
    { label: "Teams", value: formatNumber(summary.teamCount) },
    { label: "Athletes", value: formatNumber(summary.participantCount) },
    { label: "Activities", value: formatNumber(summary.activityCount) },
    { label: "Points", value: formatNumber(summary.totalPoints), accent: OCHRE },
  ]);
  y += 20;
  if (summary.winner) {
    ctx.fillStyle = MUTED;
    ctx.font = font(500, 24);
    const winnerText = `Winner: ${summary.winner.name} · ${formatNumber(summary.winner.points)} pts`;
    ctx.fillText(fitText(ctx, winnerText, contentWidth), margin, y + 8);
    y += 44;
  }
  y += 28;

  // Team
  const team = userStats
    ? summary.standings.find((s) => s.teamId === userStats.teamId)
    : summary.standings[0];
  if (team) {
    y = sectionHeading(ctx, margin, y, contentWidth, userStats ? "Your team" : "Top team", SLATE);
    ctx.fillStyle = TEXT;
    ctx.font = font(700, 36);
    ctx.fillText(fitText(ctx, team.name, contentWidth - 260), margin, y + 12);
    ctx.textAlign = "right";
    ctx.fillStyle = SLATE;
    ctx.font = font(800, 36);
    ctx.fillText(`${ordinal(team.rank)} of ${summary.teamCount}`, margin + contentWidth, y + 12);
    ctx.textAlign = "left";
    y += 44;
    y = drawTiles(ctx, margin, y, contentWidth, [
      { label: "Team points", value: formatNumber(team.points), accent: SLATE },
      { label: "Goal progress", value: `${team.progressPercent}%` },
      { label: "Activities", value: formatNumber(team.activityCount) },
      { label: "Members", value: formatNumber(team.memberCount) },
    ]);
    y += 48;
  }

  // Individual
  if (userStats) {
    y = sectionHeading(ctx, margin, y, contentWidth, `${userStats.username}`, GREEN);
    y = drawTiles(ctx, margin, y, contentWidth, [
      { label: "Activities", value: formatNumber(userStats.activityCount) },
      { label: "Points", value: formatNumber(userStats.points), accent: OCHRE },
      { label: "Active days", value: formatNumber(userStats.activeDays) },
      { label: "Of team pts", value: `${userStats.teamContributionPercent}%` },
    ]);
    y += 24;
    ctx.fillStyle = MUTED;
    ctx.font = font(500, 24);
    const bits = [
      ...(userStats.rankInTeam ? [`${ordinal(userStats.rankInTeam)} on the team`] : []),
      `${userStats.verifiedCount} verified`,
      `${userStats.evidenceCount} with evidence`,
    ];
    const topTypes = userStats.byType.slice(0, 2).map((t) => `${t.count}× ${t.displayName}`);
    ctx.fillText(fitText(ctx, [...bits, ...topTypes].join(" · "), contentWidth), margin, y + 8);
    y += 56;
  } else if (summary.standings.length > 1) {
    // Public card without personal stats: show the podium instead.
    y = sectionHeading(ctx, margin, y, contentWidth, "Final standings", GREEN);
    const rows = summary.standings.slice(0, 5);
    ctx.font = font(600, 28);
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
    y += 16;
  }

  // Footer
  ctx.strokeStyle = PANEL_EDGE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, CARD_HEIGHT - 96);
  ctx.lineTo(CARD_WIDTH - margin, CARD_HEIGHT - 96);
  ctx.stroke();
  ctx.fillStyle = MUTED;
  ctx.font = font(600, 22);
  ctx.textAlign = "left";
  ctx.fillText("Show up. Log it. Muster up.", margin, CARD_HEIGHT - 52);
  ctx.textAlign = "right";
  ctx.fillStyle = OCHRE;
  ctx.fillText("joinmuster.com", CARD_WIDTH - margin, CARD_HEIGHT - 52);
  ctx.textAlign = "left";

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

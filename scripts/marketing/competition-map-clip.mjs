// Renders a short MP4 of the real Competition tab (competition-status page)
// with one team's marker advancing along the route, for marketing/demo use.
//
// How it works: drives a local headless Chromium over CDP against the LOCAL dev
// app and intercepts every request the page makes:
//   - the signed-in user, the competition, its teams and activities are answered
//     with the scripted demo data below (nothing is read from or written to the
//     database, no account is created, no session/token rows are left behind);
//   - team emblem images are served from attached_assets/generated_images;
//   - every other third-party request (analytics, dev banner) is blocked; only
//     Google Fonts and the Stripe.js library load. Nothing reaches production
//     analytics or Slack.
// The team marker, leaderboard percentage and progress bar are then animated
// frame-by-frame with the same path math as client/src/components/progress-map.tsx,
// each frame is screenshotted, and ffmpeg stitches the frames into H.264 video.
//
// Prereqs: dev app on 127.0.0.1:5000, Chromium started with
//   --headless=new --remote-debugging-port=9333 --hide-scrollbars
// and ffmpeg on PATH. Refuses to run against anything but a loopback app URL.
//
//   node scripts/marketing/competition-map-clip.mjs [--probe]
//
// --probe only takes a layout screenshot + prints element rects (no video).
// Env knobs: START_PCT (default 58), END_PCT (default START_PCT+5), OUT_DIR.

import WebSocket from "ws";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const BASE = process.env.APP_BASE || "http://127.0.0.1:5000";
const CDP = process.env.CDP_URL || "http://127.0.0.1:9333";
const APP_HOST = new URL(BASE).hostname;
if (!["127.0.0.1", "localhost"].includes(APP_HOST) || new URL(CDP).hostname !== "127.0.0.1") {
  throw new Error("This capture tool only runs against a loopback dev app and local Chromium");
}
if (process.env.REPLIT_DEPLOYMENT) throw new Error("Refusing to run inside a deployment");

const PROBE = process.argv.includes("--probe");
const FPS = 30;
const VIEW = { w: 432, h: 936 };       // iPhone-class portrait viewport
const DSF = 2.5;                       // 432x936 * 2.5 = 1080x2340 output
const START_PCT = Number(process.env.START_PCT || 58);
const END_PCT = Number(process.env.END_PCT || START_PCT + 5);
const MOVING_TEAM = "Dawn Patrol";
const SEGMENTS = { hold0: 1.0, pulse: 0.5, move: 3.0, hold1: 2.0 }; // seconds
const OUT_DIR = process.env.OUT_DIR || "marketing/clips";
const FRAMES_DIR = "/tmp/comp-clip-frames";
const EMBLEM_DIR = "attached_assets/generated_images";
// Fonts keep typography identical; Stripe.js is loaded at app start (a blocked
// load throws and trips Vite's dev error overlay). Neither carries our analytics.
const ALLOWED_THIRD_PARTY = new Set(["fonts.googleapis.com", "fonts.gstatic.com", "js.stripe.com", "m.stripe.com", "m.stripe.network"]);
const COMMAND_TIMEOUT_MS = 30_000;
const RUN_TIMEOUT_MS = 8 * 60_000;

// ---------- demo data (answers the page's API calls) ----------
const DAY = 86_400_000;
const now = new Date();
const startDate = new Date(now.getTime() - 20 * DAY);
const endDate = new Date(now.getTime() + 10 * DAY);          // header shows "10 days left"
const monthName = startDate.toLocaleString("en-US", { month: "long", timeZone: "America/Chicago" });
const viewer = {
  id: 9500, username: "demo_capture", email: "demo-capture@example.invalid", avatar: null,
  onboardingCompleted: true, isAdmin: false, isPrivate: false, createdAt: new Date(now.getTime() - 40 * DAY).toISOString(),
};
const COMP_ID = 9001;
const competition = {
  id: COMP_ID,
  name: `${monthName} Muster`,
  description: "30 days. Four teams. Every rep counts.",
  startDate: startDate.toISOString(),
  endDate: endDate.toISOString(),
  requiredActivities: ["run", "burpees", "meditation"],
  targetGoals: ["100 km of run", "1500 reps of burpees", "600 minutes of meditation"],
  isActive: true,
  isPrivate: false,
  entryFee: 0,
  creatorId: 1,
  createdAt: new Date(startDate.getTime() - 12 * DAY).toISOString(),
};
const teamDefs = [
  { id: 9101, name: "Iron Ridge", pct: 42, motto: "Earn the summit", pictureUrl: "demo-team-iron-ridge.png", captain: 9201 },
  { id: 9102, name: MOVING_TEAM, pct: START_PCT, motto: "Up before the sun", pictureUrl: "demo-team-dawn-patrol.png", captain: 9202 },
  { id: 9103, name: "Night Owls", pct: 31, motto: "Late shift, no excuses", pictureUrl: "demo-team-night-owls.png", captain: 9203 },
  { id: 9104, name: "Rucksack Crew", pct: 19, motto: "Carry the load", pictureUrl: "demo-team-rucksack.png", captain: 9204 },
];
const teams = teamDefs.map((t) => ({
  id: t.id, name: t.name, competitionId: COMP_ID, captainId: t.captain,
  points: t.pct * 30, motto: t.motto, pictureUrl: t.pictureUrl, createdAt: competition.createdAt,
}));
const demoUsers = { 9201: "mike_r", 9202: "sarah_k", 9203: "dev_p", 9204: "jules_m" };
// One activity per required type per team; quantities are exact percentages of
// the targets (100 km / 1500 reps / 600 min), so the average equals t.pct.
const activities = [];
let actId = 98000;
for (const t of teamDefs) {
  const rows = [
    ["run", String(t.pct), `${t.pct} km logged this month`],
    ["burpees", String(t.pct * 15), "Burpee blocks, camera verified"],
    ["meditation", String(t.pct * 6), "Morning meditation streak"],
  ];
  rows.forEach(([type, quantity, description], i) => {
    activities.push({
      id: ++actId, userId: t.captain, competitionId: COMP_ID, teamId: t.id, type, description, quantity,
      evidenceType: "text", evidenceUrl: null, points: Number(quantity), isFlagged: false,
      createdAt: new Date(startDate.getTime() + (2 + i * 5) * DAY).toISOString(),
      imageUrls: [], thumbnailUrl: null, textInput: null, fromAppleHealth: false, isVerified: type === "burpees",
      user: { id: t.captain, username: demoUsers[t.captain], avatar: null },
      team: { id: t.id, name: t.name },
      competition: { id: COMP_ID, name: competition.name },
      likesCount: 0, commentsCount: 0,
    });
  });
}
const membership = [{
  id: 9301, teamId: 9102, userId: viewer.id, role: "member",
  joinedAt: new Date(startDate.getTime() - 3 * DAY).toISOString(),
  team: teams.find((t) => t.name === MOVING_TEAM),
}];

// ---------- tiny CDP client ----------
class Cdp {
  constructor(ws) {
    this.ws = ws; this.seq = 0; this.pending = new Map(); this.handlers = new Map();
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id) {
        const p = this.pending.get(msg.id); this.pending.delete(msg.id);
        if (!p) return;
        clearTimeout(p.timer);
        msg.error ? p.reject(new Error(`${p.method}: ${msg.error.message}`)) : p.resolve(msg.result);
      } else {
        const h = this.handlers.get(msg.method);
        if (h) Promise.resolve().then(() => h(msg.params, msg.sessionId)).catch((e) => console.error(`${msg.method} handler:`, e.message));
      }
    });
    const failAll = (why) => {
      for (const [id, p] of this.pending) { clearTimeout(p.timer); p.reject(new Error(`${p.method}: ${why}`)); this.pending.delete(id); }
    };
    ws.on("close", () => failAll("websocket closed"));
    ws.on("error", (e) => failAll(`websocket error: ${e.message}`));
  }
  send(method, params = {}, sessionId) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`${method}: timed out`)); }, COMMAND_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, method, timer });
      this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
  on(method, fn) { this.handlers.set(method, fn); }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const version = await (await fetch(`${CDP}/json/version`)).json();
  const ws = new WebSocket(version.webSocketDebuggerUrl, { perMessageDeflate: false });
  await new Promise((res, rej) => { ws.once("open", res); ws.once("error", rej); });
  const cdp = new Cdp(ws);
  let targetId = null;
  const cleanup = async () => {
    if (targetId) await cdp.send("Target.closeTarget", { targetId }).catch(() => {});
    ws.close();
    fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
  };

  try {
    ({ targetId } = await cdp.send("Target.createTarget", { url: "about:blank", width: VIEW.w, height: VIEW.h, newWindow: true }));
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    const send = (m, p) => cdp.send(m, p, sessionId);
    const evaluate = async (expression) => {
      const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };
    const waitFor = async (condition, timeoutMs = 20000) => {
      const t0 = Date.now();
      while (Date.now() - t0 < timeoutMs) {
        if (await evaluate(`(() => { try { return !!(${condition}); } catch { return false; } })()`)) return;
        await sleep(150);
      }
      throw new Error(`timeout waiting for: ${condition}`);
    };

    // ---- intercept everything the page requests ----
    const emblems = Object.fromEntries(teamDefs.map((t) => [t.pictureUrl, fs.readFileSync(path.join(EMBLEM_DIR, t.pictureUrl)).toString("base64")]));
    const fulfill = (requestId, contentType, body) => send("Fetch.fulfillRequest", {
      requestId, responseCode: 200,
      responseHeaders: [{ name: "Content-Type", value: contentType }, { name: "Cache-Control", value: "no-store" }],
      body,
    });
    const json = (requestId, data) => fulfill(requestId, "application/json", Buffer.from(JSON.stringify(data)).toString("base64"));
    cdp.on("Fetch.requestPaused", async (p, sid) => {
      if (sid !== sessionId) return;
      const { requestId } = p;
      const u = new URL(p.request.url);
      try {
        if (u.hostname !== APP_HOST) {
          if (ALLOWED_THIRD_PARTY.has(u.hostname)) return await send("Fetch.continueRequest", { requestId });
          return await send("Fetch.failRequest", { requestId, errorReason: "BlockedByClient" });
        }
        if (u.pathname === "/api/auth/me") return await json(requestId, viewer);
        if (u.pathname === `/api/team-members/${viewer.id}`) return await json(requestId, membership);
        if (u.pathname === `/api/competitions/${COMP_ID}`) return await json(requestId, competition);
        if (u.pathname === `/api/teams/competition/${COMP_ID}`) return await json(requestId, teams);
        if (u.pathname === `/api/activities/competition/${COMP_ID}`) return await json(requestId, activities);
        const img = u.pathname.match(/^\/uploads\/(demo-team-[a-z-]+\.png)$/);
        if (img && emblems[img[1]]) return await fulfill(requestId, "image/png", emblems[img[1]]);
        await send("Fetch.continueRequest", { requestId });
      } catch (e) {
        console.error("intercept error", u.pathname, e.message);
        await send("Fetch.continueRequest", { requestId }).catch(() => {});
      }
    });

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");
    await send("Network.setBypassServiceWorker", { bypass: true }); // keep every request visible to Fetch interception
    await send("Emulation.setDeviceMetricsOverride", { width: VIEW.w, height: VIEW.h, deviceScaleFactor: DSF, mobile: true });
    await send("Emulation.setTimezoneOverride", { timezoneId: "America/Chicago" });
    await send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });

    // ---- "sign in": the app trusts localStorage.user and then confirms via
    // /api/auth/me, which is intercepted above. No real login happens. ----
    await send("Page.navigate", { url: `${BASE}/login` });
    await waitFor("document.readyState === 'complete'");
    await evaluate(`(() => {
      localStorage.setItem('user', JSON.stringify(${JSON.stringify(viewer)}));
      // The animated parachute splash plays once per browser session; mark it seen
      // so it does not cover the competition page while we capture.
      sessionStorage.setItem('muster_splash_shown', '1');
      return true;
    })()`);

    // ---- open the competition tab and wait for the map to settle ----
    await send("Page.navigate", { url: `${BASE}/competition-status` });
    const teamNames = JSON.stringify(teamDefs.map((t) => t.name));
    await waitFor(`[...document.querySelectorAll('img[alt]')].filter(i => ${teamNames}.includes(i.alt)).length === ${teamDefs.length}`);
    await waitFor(`[...document.querySelectorAll('img[alt]')].filter(i => ${teamNames}.includes(i.alt)).every(i => i.complete && i.naturalWidth > 0)`);
    await evaluate("document.fonts.ready.then(() => true)");
    await sleep(1500); // let the 1s marker/progress-bar CSS transitions finish

    // Hook up the elements we animate. Same route math as progress-map.tsx.
    await evaluate(`(() => {
      const name = ${JSON.stringify(MOVING_TEAM)};
      const img = document.querySelector('img[alt="' + name + '"]');
      const wrapper = img.closest('.transition-all');
      const tile = [...document.querySelectorAll('.inner-tile')].find(t => t.querySelector('h3')?.textContent.trim() === name);
      const pctEl = tile.querySelector('.text-military-green.font-bold');
      const bar = tile.querySelector('.bg-military-green.h-2');
      const sub = tile.querySelector('.text-gray-400');
      for (const el of [wrapper, bar]) el.style.transition = 'none';
      document.documentElement.style.scrollBehavior = 'auto';
      // The floating "log activity" button hovers over the leaderboard percentage
      // at this scroll position; hide that overlay so the number stays readable.
      document.querySelector('button.fixed.bottom-28')?.style.setProperty('display', 'none');
      document.querySelector('vite-error-overlay')?.remove(); // dev-only overlay, never part of the app UI
      const pos = (pct) => {
        const t = Math.min((pct / 85) * 0.75, 1.2);
        let x, y;
        if (t <= 0.2) { const l = t / 0.2; x = 12 + 15 * l; y = 80 - 8 * l + 4 * Math.sin(l * Math.PI); }
        else if (t <= 0.4) { const l = (t - 0.2) / 0.2; x = 27 + 19 * l; y = 76 + 6 * l - 16 * l * l; }
        else if (t <= 0.6) { const l = (t - 0.4) / 0.2; x = 46 + 20 * l; y = 66 - 16 * l + 5 * Math.sin(l * Math.PI); }
        else if (t <= 0.8) { const l = (t - 0.6) / 0.2; x = 66 + 19 * l; y = 55 + 5 * l - 50 * l * l; }
        else { const l = (t - 0.8) / 0.4; x = 85 + 15 * l; y = 10 - 25 * l; }
        return { x, y };
      };
      window.__clip = {
        set(pct, scale) {
          const { x, y } = pos(pct);
          wrapper.style.left = x + '%';
          wrapper.style.top = y + '%';
          wrapper.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
          wrapper.style.zIndex = scale > 1 ? '30' : '';
          const shown = Math.round(Math.min(pct, 100));
          pctEl.textContent = shown + '%';
          sub.textContent = shown + '% complete';
          bar.style.width = Math.min(pct, 100) + '%';
        },
        rects() {
          const r = (el) => { const b = el.getBoundingClientRect(); return { top: b.top + scrollY, bottom: b.bottom + scrollY, left: b.left, right: b.right }; };
          const header = [...document.querySelectorAll('h3')].find(h => h.textContent.trim() === 'Team Progress Map');
          const nav = document.querySelector('header, nav');
          const bottomNav = [...document.querySelectorAll('div, nav')].find(el => { const cs = getComputedStyle(el); return cs.position === 'fixed' && cs.bottom === '0px' && el.getBoundingClientRect().height > 40; });
          return { header: r(header), map: r(document.querySelector('.h-96')), tile: r(tile), navBottom: nav ? nav.getBoundingClientRect().bottom : 0,
                   bottomNavTop: bottomNav ? bottomNav.getBoundingClientRect().top : innerHeight, docHeight: document.documentElement.scrollHeight };
        },
      };
      return true;
    })()`);
    const rects = await evaluate("window.__clip.rects()");
    console.log("layout", JSON.stringify(rects));

    // Keep the page at the top when the moving team's name/percentage row already
    // clears the bottom nav (it is rank #1, right under the map); otherwise scroll
    // just enough to bring that row into view.
    const rowBottom = rects.tile.top + 64; // name + % line and the progress bar
    const scrollY = Math.max(0, Math.min(rowBottom - rects.bottomNavTop, rects.header.top - rects.navBottom - 8));
    await evaluate(`(window.scrollTo(0, ${scrollY}), window.scrollY)`);
    await sleep(300);
    const shot = async (file) => {
      const { data } = await send("Page.captureScreenshot", { format: "jpeg", quality: 93 });
      fs.writeFileSync(file, Buffer.from(data, "base64"));
    };
    fs.mkdirSync(OUT_DIR, { recursive: true });
    if (PROBE) {
      await evaluate(`window.__clip.set(${START_PCT}, 1)`);
      await shot("/tmp/comp-clip-probe.jpg");
      console.log("probe saved /tmp/comp-clip-probe.jpg scrollY", scrollY);
      return;
    }

    // ---- render frames ----
    fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
    fs.mkdirSync(FRAMES_DIR, { recursive: true });
    const easeInOutCubic = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
    const total = Math.round((SEGMENTS.hold0 + SEGMENTS.pulse + SEGMENTS.move + SEGMENTS.hold1) * FPS);
    const tPulse = SEGMENTS.hold0, tMove = tPulse + SEGMENTS.pulse, tEnd = tMove + SEGMENTS.move;
    for (let i = 0; i < total; i++) {
      const t = i / FPS;
      let pct = START_PCT, scale = 1;
      if (t >= tPulse && t < tMove) scale = 1 + 0.18 * Math.sin(((t - tPulse) / SEGMENTS.pulse) * Math.PI);
      else if (t >= tMove && t < tEnd) pct = START_PCT + (END_PCT - START_PCT) * easeInOutCubic((t - tMove) / SEGMENTS.move);
      else if (t >= tEnd) pct = END_PCT;
      await evaluate(`window.__clip.set(${pct}, ${scale})`);
      await shot(path.join(FRAMES_DIR, `f_${String(i).padStart(4, "0")}.jpg`));
      if (i % 30 === 0) console.log(`frame ${i}/${total}`);
    }

    // ---- encode ----
    const even = (n) => Math.floor(n / 2) * 2;
    const full = path.join(OUT_DIR, "competition-map-progress-full.mp4");
    const close = path.join(OUT_DIR, "competition-map-progress-closeup.mp4");
    const common = ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(FRAMES_DIR, "f_%04d.jpg")];
    const enc = ["-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart"];
    execFileSync("ffmpeg", [...common, ...enc, full]);
    // Close-up: from the "Team Progress Map" tab header to the bottom of the moving team's row.
    const cropTop = even(Math.max(0, (rects.header.top - scrollY - 16) * DSF));
    const cropBottom = even(Math.min(rects.bottomNavTop * DSF, (rects.tile.bottom - scrollY + 10) * DSF));
    execFileSync("ffmpeg", [...common, "-vf", `crop=${VIEW.w * DSF}:${cropBottom - cropTop}:0:${cropTop}`, ...enc, close]);
    console.log("wrote", full, "and", close);
  } finally {
    await cleanup();
  }
}

const watchdog = setTimeout(() => { console.error(`gave up after ${RUN_TIMEOUT_MS / 60000} min`); process.exit(1); }, RUN_TIMEOUT_MS);
main().then(() => { clearTimeout(watchdog); process.exit(0); }, (e) => { console.error(e); process.exit(1); });

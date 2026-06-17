import { useEffect, useRef, useState } from "react";

/**
 * Muster "drop-in" splash — the squad parachutes onto the muster point, then the
 * screen fades to the app. The static Muster mark (peak line + beacon) is shown
 * immediately so it lines up seamlessly with the native iOS launch image and the
 * first-paint mark in index.html; only the parachutists animate on top.
 *
 * Ported from the marketing site's drop-in animation (marketing-site/index.html),
 * trimmed to a single pass: the squad jumps off the right peak and drifts down
 * and off to the right (clear of the mark), just like the website.
 */

const SVGNS = "http://www.w3.org/2000/svg";

function makeFigure(): string {
  return (
    '<g class="canopy" style="transform-box:fill-box;transform-origin:50% 100%;">' +
    '<path d="M-7,-8 Q0,-16 7,-8 Q0,-11 -7,-8 Z" fill="#D2913C"/>' +
    '<path d="M-3.4,-9.7 Q0,-13.4 3.4,-9.7" fill="none" stroke="#181B14" stroke-width="0.5" opacity="0.4"/>' +
    "</g>" +
    '<path d="M-6,-8.2 L-0.6,-2.6 M6,-8.2 L0.6,-2.6 M0,-9.7 L0,-2.8" ' +
    'stroke="#ECE6D6" stroke-width="0.5" opacity="0.9" fill="none" stroke-linecap="round"/>' +
    '<g stroke="#ECE6D6" stroke-width="0.95" stroke-linecap="round" fill="none">' +
    '<circle cx="0" cy="-1.7" r="1.05" fill="#ECE6D6" stroke="none"/>' +
    '<path d="M0,-0.7 L0,1.9"/>' +
    '<path d="M0,-0.2 L-1.5,-1.2 M0,-0.2 L1.5,-1.2"/>' +
    '<path d="M0,1.9 L-1.4,3.8 M0,1.9 L1.4,3.8"/>' +
    "</g>"
  );
}

export default function MusterSplash({ onDone }: { onDone: () => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const chutersRef = useRef<SVGGElement>(null);
  const [hiding, setHiding] = useState(false);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setHiding(true);
    window.setTimeout(onDone, 540); // matches the fade-out below
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    const svg = svgRef.current;
    const host = chutersRef.current;
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // If animation is unavailable or the user prefers reduced motion, just hold
    // the static mark briefly and fade — never block entry into the app.
    if (!svg || !host || reduce || typeof (svg as unknown as { animate?: unknown }).animate !== "function") {
      const t = window.setTimeout(() => finishRef.current(), reduce ? 750 : 0);
      return () => window.clearTimeout(t);
    }

    const anims: Animation[] = [];
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const rnd = () => Math.random();
    const animate = (el: Element, kf: Keyframe[], opt: KeyframeAnimationOptions) => {
      const a = (el as unknown as { animate: (k: Keyframe[], o: KeyframeAnimationOptions) => Animation }).animate(
        kf,
        Object.assign({ fill: "both" } as KeyframeAnimationOptions, opt),
      );
      anims.push(a);
      return a;
    };

    const SUMMIT = { x: 117, y: 24 }; // the tall right-hand peak, in viewBox coords
    const NUM = 5;

    type Chuter = {
      pos: SVGElement;
      sway: SVGElement;
      canopy: SVGElement;
      jx: number;
      jh: number;
      ex: number;
      ey: number;
      wind: number;
      dur: number;
      amp: number;
      stagger: number;
    };

    const chuters: Chuter[] = [];
    for (let i = 0; i < NUM; i++) {
      const pos = document.createElementNS(SVGNS, "g");
      pos.setAttribute("class", "cPos");
      pos.style.opacity = "0";
      pos.innerHTML =
        '<g class="sway" style="transform-box:fill-box;transform-origin:50% 6%;">' +
        '<g transform="scale(0.9)">' +
        makeFigure() +
        "</g></g>";
      host.appendChild(pos);
      chuters.push({
        pos,
        sway: pos.querySelector(".sway") as SVGElement,
        canopy: pos.querySelector(".canopy") as SVGElement,
        jx: 3 + rnd() * 3,
        jh: 4 + rnd() * 3,
        // jump off the right peak and drift down-and-off to the right, clear of
        // the mark — matches the marketing site instead of landing on the logo
        ex: 150 + i * 16 + rnd() * 22,
        ey: 84 + rnd() * 16,
        wind: 3 + rnd() * 8,
        dur: 2100 + rnd() * 460,
        amp: 5 + rnd() * 5,
        stagger: i * 170 + (rnd() * 36 - 18),
      });
    }

    const START = 450; // hold the static mark so the native -> web handoff is seamless

    chuters.forEach((c) => {
      const d = START + c.stagger;
      const apexX = SUMMIT.x + c.jx;
      const apexY = SUMMIT.y - c.jh;
      const midX = lerp(apexX, c.ex, 0.55) + c.wind;
      const midY = lerp(apexY, c.ey, 0.46);
      animate(
        c.pos,
        [
          { offset: 0, transform: `translate(${SUMMIT.x}px,${SUMMIT.y}px)`, opacity: 0, easing: "cubic-bezier(.2,.7,.3,1)" },
          { offset: 0.07, transform: `translate(${apexX}px,${apexY}px)`, opacity: 1, easing: "cubic-bezier(.4,.45,.6,1)" },
          { offset: 0.5, transform: `translate(${midX}px,${midY}px)`, easing: "linear" },
          { offset: 1, transform: `translate(${c.ex}px,${c.ey}px)` },
        ],
        { duration: c.dur, delay: d },
      );
      animate(
        c.canopy,
        [
          { offset: 0, transform: "scale(0.10)" },
          { offset: 0.4, transform: "scale(0.12)" },
          { offset: 0.75, transform: "scale(1.12)" },
          { offset: 1, transform: "scale(1)" },
        ],
        { duration: 860, delay: d, easing: "cubic-bezier(.3,.7,.25,1)" },
      );
      animate(
        c.sway,
        [
          { offset: 0, transform: "rotate(0deg)" },
          { offset: 0.12, transform: "rotate(0deg)" },
          { offset: 0.34, transform: `rotate(${c.amp}deg)` },
          { offset: 0.56, transform: `rotate(${-c.amp * 0.78}deg)` },
          { offset: 0.78, transform: `rotate(${c.amp * 0.5}deg)` },
          { offset: 1, transform: `rotate(${-c.amp * 0.28}deg)` },
        ],
        { duration: c.dur, delay: d, easing: "ease-in-out" },
      );
    });

    // the muster point ignites as the squad converges
    const pulseEl = svg.querySelector(".ia-pulse");
    if (pulseEl) {
      animate(
        pulseEl,
        [
          { opacity: 0, transform: "scale(0.7)", offset: 0 },
          { opacity: 0.55, transform: "scale(0.95)", offset: 0.12 },
          { opacity: 0, transform: "scale(2.6)", offset: 1 },
        ],
        { duration: 1500, delay: START + 850, easing: "cubic-bezier(.2,.6,.2,1)" },
      );
    }

    // single pass: last jumper starts at START + (NUM-1)*170, descends ~dur, brief hold
    const total = START + (NUM - 1) * 170 + 2560 + 320;
    const t = window.setTimeout(() => finishRef.current(), total);

    return () => {
      window.clearTimeout(t);
      anims.forEach((a) => {
        try {
          a.cancel();
        } catch {
          /* noop */
        }
      });
    };
  }, []);

  return (
    <div
      onClick={finish}
      role="img"
      aria-label="Muster"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        background: "#181B14",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: hiding ? 0 : 1,
        transition: "opacity 0.52s ease",
        pointerEvents: hiding ? "none" : "auto",
      }}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 200 118"
        width="78%"
        style={{ maxWidth: 540, height: "auto", overflow: "visible", display: "block" }}
        aria-hidden="true"
      >
        <g transform="translate(50,4)">
          {/* the muster point mark — drawn fully from the first frame */}
          <path
            d="M17 76 L32 34 L49 64 L67 20 L84 74"
            fill="none"
            stroke="#ECE6D6"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="17" cy="76" r="2.9" fill="#ECE6D6" />
          <circle cx="84" cy="74" r="2.6" fill="#ECE6D6" />
          <circle cx="32" cy="34" r="3.3" fill="#D2913C" />
          <circle cx="67" cy="20" r="3.4" fill="#D2913C" />
          {/* summit flag */}
          <line x1="67" y1="18" x2="67" y2="2.8" stroke="#ECE6D6" strokeWidth="2" strokeLinecap="round" />
          <path d="M67.6 4.4 L79.5 8.6 L67.6 12.8 Z" fill="#D2913C" />
          <circle cx="67" cy="2.6" r="2" fill="#ECE6D6" />
          {/* signal pulse from the muster point */}
          <circle
            className="ia-pulse"
            cx="49"
            cy="64"
            r="6.5"
            fill="none"
            stroke="#ECE6D6"
            strokeWidth="1.5"
            style={{ opacity: 0, transformBox: "fill-box", transformOrigin: "center" }}
          />
          {/* the beacon */}
          <g>
            <circle cx="49" cy="64" r="6.5" fill="#181B14" />
            <circle cx="49" cy="64" r="10" fill="none" stroke="#ECE6D6" strokeWidth="1.2" opacity="0.32" />
            <circle cx="49" cy="64" r="6.5" fill="none" stroke="#ECE6D6" strokeWidth="2.2" />
            <circle cx="49" cy="64" r="3.3" fill="#6E93A6" />
          </g>
        </g>
        {/* parachutists are injected here, on top */}
        <g ref={chutersRef} className="ia-chuters" />
      </svg>
    </div>
  );
}

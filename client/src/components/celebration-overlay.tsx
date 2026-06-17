import { useEffect, useRef, useState } from "react";

/**
 * Full-screen, non-interactive explosion that goes off when the `muster:celebrate`
 * event fires (see lib/celebrate.ts): a flash, fireball, expanding shockwave rings
 * and a smoke puff, with the "Way to Muster up!" banner punching in right after.
 * The flying debris/sparks, sound and haptics are handled imperatively in
 * celebrate(); this draws the blast and the message.
 */
export default function CelebrationOverlay() {
  const [show, setShow] = useState(false);
  const timer = useRef<number | null>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const onCelebrate = () => {
      if (timer.current) window.clearTimeout(timer.current);
      if (raf.current) cancelAnimationFrame(raf.current);
      // Remount the blast each time so the CSS animations restart cleanly.
      setShow(false);
      raf.current = requestAnimationFrame(() => {
        setShow(true);
        timer.current = window.setTimeout(() => setShow(false), 2400);
      });
    };
    window.addEventListener("muster:celebrate", onCelebrate as EventListener);
    return () => {
      window.removeEventListener("muster:celebrate", onCelebrate as EventListener);
      if (timer.current) window.clearTimeout(timer.current);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none overflow-hidden">
      <div className="muster-boom" aria-hidden="true">
        <span className="muster-boom__flash" />
        <span className="muster-boom__fire" />
        <span className="muster-boom__shock" />
        <span className="muster-boom__shock muster-boom__shock--2" />
        <span className="muster-boom__smoke" />
      </div>
      <div className="celebrate-pop relative z-10 text-center px-6">
        <div className="text-4xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-[#FFE08A] via-[#E2A551] to-[#D2913C] drop-shadow-[0_2px_22px_rgba(232,99,42,0.65)]">
          Way to Muster up!
        </div>
      </div>
    </div>
  );
}

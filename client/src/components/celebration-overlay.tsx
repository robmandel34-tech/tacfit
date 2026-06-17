import { useEffect, useRef, useState } from "react";

/**
 * Full-screen, non-interactive banner that flashes "Way to Muster up!" when the
 * `muster:celebrate` event fires (see lib/celebrate.ts). Confetti, sound, and
 * haptics are handled imperatively in celebrate(); this only draws the message.
 */
export default function CelebrationOverlay() {
  const [show, setShow] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const onCelebrate = () => {
      if (timer.current) window.clearTimeout(timer.current);
      setShow(true);
      timer.current = window.setTimeout(() => setShow(false), 2400);
    };
    window.addEventListener("muster:celebrate", onCelebrate as EventListener);
    return () => {
      window.removeEventListener("muster:celebrate", onCelebrate as EventListener);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none">
      <div className="celebrate-pop text-center px-6">
        <div className="text-4xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-[#E2A551] to-[#D2913C] drop-shadow-[0_2px_16px_rgba(210,145,60,0.55)]">
          Way to Muster up!
        </div>
      </div>
    </div>
  );
}

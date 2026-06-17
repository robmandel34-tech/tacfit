import confetti from "canvas-confetti";
import { Capacitor } from "@capacitor/core";

// Client-only preference: whether the celebration sound plays. The explosion,
// message, and haptic buzz always fire — only the audio respects this toggle so
// people training in a quiet gym aren't blasting a fanfare.
const SOUND_KEY = "muster_celebration_sound";

// Stadium-anthem stings live in client/public/celebration. A random one plays
// each time so it stays fresh.
const SOUNDS = [
  "/celebration/stadium-1.mp3",
  "/celebration/stadium-2.mp3",
  "/celebration/stadium-3.mp3",
  "/celebration/stadium-4.mp3",
];

// Fiery explosion palette — flares of white/yellow through orange to deep red,
// blended with the brand gold so the blast still feels like Muster.
const FIRE = ["#FFFFFF", "#FFE08A", "#F5A623", "#E2A551", "#E8632A", "#B23A1E"];

export function isCelebrationSoundOn(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setCelebrationSound(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? "1" : "0");
  } catch {
    /* ignore (private mode / unavailable storage) */
  }
}

function playSound(): void {
  if (!isCelebrationSoundOn()) return;
  try {
    const src = SOUNDS[Math.floor(Math.random() * SOUNDS.length)];
    const audio = new Audio(src);
    audio.volume = 0.85;
    // iOS respects the hardware silent switch for this; that's intentional.
    audio.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

function fireExplosion(): void {
  // The flash / fireball / shockwave / smoke are drawn by CelebrationOverlay via
  // CSS. Here we add the flying debris and sparks: an omnidirectional blast of
  // fiery particles thrown out from the center of the screen.
  const base = {
    colors: FIRE,
    zIndex: 100000,
    disableForReducedMotion: true,
    origin: { x: 0.5, y: 0.5 },
  } as const;
  try {
    // Heavy debris hurled out in every direction.
    confetti({ ...base, particleCount: 130, spread: 360, startVelocity: 48, gravity: 1.2, decay: 0.9, scalar: 1.1, ticks: 110 });
    // Fast, bright sparks streaking outward.
    confetti({ ...base, particleCount: 60, spread: 360, startVelocity: 75, gravity: 0.7, decay: 0.85, scalar: 0.7, ticks: 80 });
    // A secondary puff a beat later as the blast settles.
    setTimeout(() => {
      try {
        confetti({ ...base, particleCount: 45, spread: 360, startVelocity: 28, gravity: 1.5, decay: 0.92, scalar: 1.35, ticks: 100 });
      } catch {
        /* ignore */
      }
    }, 130);
  } catch {
    /* ignore */
  }
}

async function buzz(): Promise<void> {
  // Native iOS/Android: rich haptic pattern timed to land like a victory hit.
  if (Capacitor.isNativePlatform()) {
    try {
      const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
      await Haptics.notification({ type: NotificationType.Success });
      const beats: Array<{ style: any; gap: number }> = [
        { style: ImpactStyle.Medium, gap: 120 },
        { style: ImpactStyle.Medium, gap: 120 },
        { style: ImpactStyle.Heavy, gap: 0 },
      ];
      for (const beat of beats) {
        await Haptics.impact({ style: beat.style });
        if (beat.gap) await new Promise((r) => setTimeout(r, beat.gap));
      }
    } catch {
      /* plugin missing on this build — ignore */
    }
    return;
  }
  // Web / Android browser fallback. (iOS Safari has no vibration — this no-ops.)
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([60, 50, 60, 50, 140]);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Fire the full "Way to Muster up!" celebration: an explosion (flash, fireball,
 * shockwave, smoke + flying debris/sparks), a random stadium sting (if sound is
 * on), a haptic buzz, and the on-screen banner.
 */
export function celebrate(): void {
  playSound();
  fireExplosion();
  void buzz();
  try {
    window.dispatchEvent(new CustomEvent("muster:celebrate"));
  } catch {
    /* ignore */
  }
}

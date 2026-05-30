import { useId } from "react";
import { cn } from "@/lib/utils";

// A set of detailed, varied user silhouettes used as the default avatar when a
// person has not uploaded a photo. A silhouette is chosen deterministically from
// the user's seed (id or username) so the same person always gets the same look,
// while different people get different hair/shape styles — including
// female-presenting options.

type SeedValue = string | number | null | undefined;

// Shared head + neck + shoulders, drawn under every hairstyle.
const BASE = (
  <>
    <path d="M16.8 19.5 H23.2 V26.2 H16.8 Z" />
    <path d="M3.5 40 C3.5 31 8 27.5 13 26.5 C15.5 26 17.5 25.8 20 25.8 C22.5 25.8 24.5 26 27 26.5 C32 27.5 36.5 31 36.5 40 Z" />
    <ellipse cx="20" cy="14.5" rx="6.4" ry="7.1" />
  </>
);

// Each variant adds a hairstyle (same fill, so shapes merge into one silhouette).
const VARIANTS: JSX.Element[] = [
  // 0 — short male
  <path
    key="short"
    d="M13.5 13.5 C13.5 7.5 16.2 5.5 20 5.5 C23.8 5.5 26.5 7.5 26.5 13.5 C24.5 10 22.5 9 20 9 C17.5 9 15.5 10 13.5 13.5 Z"
  />,
  // 1 — bald / clean (no hair)
  <g key="bald" />,
  // 2 — female bob (frames the face to the jaw)
  <path
    key="bob"
    d="M12.5 14 C12.5 6.5 15.8 4.5 20 4.5 C24.2 4.5 27.5 6.5 27.5 14 L27.5 20 C27.5 21.6 26.1 22.1 25.7 20.4 L25.7 14 C25.7 9.5 23 8 20 8 C17 8 14.3 9.5 14.3 14 L14.3 20.4 C13.9 22.1 12.5 21.6 12.5 20 Z"
  />,
  // 3 — female long (hair past the shoulders)
  <path
    key="long"
    d="M11.8 14.5 C11.8 6 15.3 3.8 20 3.8 C24.7 3.8 28.2 6 28.2 14.5 L29 27.5 C29.2 29.6 26.7 29.8 26.5 27.7 L26 14 C26 9.5 23.2 8 20 8 C16.8 8 14 9.5 14 14 L13.5 27.7 C13.3 29.8 10.8 29.6 11 27.5 Z"
  />,
  // 4 — spiky male
  <path
    key="spiky"
    d="M13.8 12 L14 6.5 L16.3 9.5 L17.8 5 L20 8.8 L22.2 5 L23.7 9.5 L26 6.5 L26.2 12 C24 9.5 22 8.5 20 8.5 C18 8.5 16 9.5 13.8 12 Z"
  />,
  // 5 — crew / fade male (flatter top)
  <path
    key="crew"
    d="M13 12.5 C13 8.5 16 7 20 7 C24 7 27 8.5 27 12.5 C24.5 10.2 22.3 9.6 20 9.6 C17.7 9.6 15.5 10.2 13 12.5 Z"
  />,
  // 6 — female with side ponytail
  <g key="pony">
    <path d="M13.2 13 C13.2 6.8 16.3 5 20 5 C23.7 5 26.8 6.8 26.8 13 C24.8 9.8 22.5 8.8 20 8.8 C17.5 8.8 15.2 9.8 13.2 13 Z" />
    <path d="M26 11 C29.6 12 31.1 15 30.2 19.6 C29.9 21.4 27.7 21.1 27.8 19.2 C28.2 16 27.3 13.4 25.4 12 Z" />
  </g>,
  // 7 — voluminous / curly (rounded dome)
  <path
    key="dome"
    d="M10.8 14 C10.8 6.5 14.5 4 20 4 C25.5 4 29.2 6.5 29.2 14 C29.2 11 25 9 20 9 C15 9 10.8 11 10.8 14 Z"
  />,
];

function pickVariant(seed: SeedValue): number {
  const s = String(seed ?? "");
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return hash % VARIANTS.length;
}

interface DefaultAvatarProps {
  seed?: SeedValue;
  className?: string;
}

export function DefaultAvatar({ seed, className }: DefaultAvatarProps) {
  const gradId = useId();
  const variant = pickVariant(seed);
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("h-full w-full", className)}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3d5c3a" />
          <stop offset="100%" stopColor="#16241a" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" fill={`url(#${gradId})`} />
      <g fill="rgba(255,255,255,0.9)">
        {BASE}
        {VARIANTS[variant]}
      </g>
    </svg>
  );
}

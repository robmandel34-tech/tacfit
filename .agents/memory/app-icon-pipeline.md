---
name: App icon pipeline
description: How Muster's favicons / PWA / iOS app icons are generated from the brand mark, and the iOS no-alpha rule.
---

# App icon generation

The brand mark is a vector SVG (`attached_assets/muster-mark_*.svg`): a mountain-peak
"M" with bone strokes, ochre upper dots, slate center dot, designed to sit on the
field-olive background `#181B14`.

All raster icons (web favicons, the `tacfit-icon-*`/`tacfit-app-icon` PWA/apple-touch
files, `tacfit-shield.png`, repo-root + marketing-site copies, and the iOS
`AppIcon-512@2x.png`) are generated FROM that SVG by compositing the trimmed mark
(~62% size, centered) onto a solid `#181B14` square via ImageMagick (`magick`, with
librsvg as the SVG delegate for crisp rendering).

**Why filenames stay `tacfit-*`:** they're kept identical to the originals so no
manifest.json / index.html path edits are needed — only the image bytes change.
Bump the `?v=N` cache-bust in `client/index.html` when icons change.

**iOS gotcha — app icon MUST be opaque (no alpha channel).** Apple rejects app
icons that contain transparency. When generating, finish with `-alpha remove -alpha off`
and verify with `magick identify -format '%A'` → must be `Undefined`/`False`, not
`Blend`/`On`. A transparent PNG mark composited onto an olive square still carries an
alpha channel unless you strip it.

**Summit flag (added 2026-06-17):** the mark now has a small flag on the RIGHT peak
(67,20): cream pole up to y≈2.8, cream knob `circle cx=67 cy=2.6 r=2`, orange
right-pointing pennant `path d="M67.6 4.4 L79.5 8.6 L67.6 12.8 Z"`. The mark is
DUPLICATED inline in several places that must stay in sync (no shared source) — when
the mark changes, update ALL of them or they drift:
`client/src/assets/muster-mark.svg` (canonical, used by nav/login/register),
`client/index.html` (first-paint splash), `client/src/components/MusterSplash.tsx`
(JSX — uses camelCase `strokeWidth`/`strokeLinecap`), and the 11 marketing-site
inline copies (10 nav/footer logos + 1 animated hero infil in `marketing-site/index.html`,
where the flag is a `.ia-summit-flag` group wired into `pop()`, the fade-out array,
and `hideMarks()`). Rasters regenerate from `/tmp/icon-master.svg` (icons) and
`/tmp/splash-master.svg` (splash). Bump `?v=N` in `client/index.html` on icon change.
The 7 PWA `splash-*.png` startup images were stale "TacFit" green text until this
change — they now show the Muster mark centered (~42% width) on `#181B14`.

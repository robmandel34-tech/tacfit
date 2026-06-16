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

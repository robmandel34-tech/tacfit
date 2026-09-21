---
name: Global button focus reset
description: index.css strips outline/box-shadow from every button:focus-visible with !important; custom selectable controls need a non-button element to carry the focus ring.
---

# Global `button:focus-visible` reset

Rule: `client/src/index.css` sets `outline: none !important; box-shadow: none !important` on `button:focus`, `button:active` and `button:focus-visible`. Any keyboard focus ring applied to a `<button>` (including Tailwind `focus-visible:ring-*` and Radix `role="radio"` items, which render as buttons) is invisible.

**Why:** added long ago to stop white tap highlights in the iOS WebView; removing it now would change every button in the app. Architect review flagged the onboarding radio cards as keyboard-inaccessible because of it (2026-09-20).

**How to apply:** for selectable cards/radios, use a native `<input type="radio" class="sr-only">` inside a `<label>` and put the ring on the label with `has-[:focus-visible]:ring-2 ...` (Tailwind 3.4 `has-*` variant works here). Native radios also give arrow-key navigation and `required` semantics for free. Verified working in headless Chromium with real key events.

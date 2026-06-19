---
name: WAAPI partial keyframe opacity fade-out
description: Web Animations API fills a missing property on the last keyframe from the element's underlying value, causing unexpected fade-outs.
---

# WAAPI partial-keyframe gotcha

When a Web Animations API `element.animate()` call sets a property (e.g. `opacity`)
on only the EARLY keyframes and omits it on the final keyframe, the engine does
NOT hold the last specified value. It synthesizes an implicit keyframe at offset 1
using the element's **underlying value** (its inline/computed style) and
interpolates toward it.

**Symptom seen:** a figure animated `opacity:0 → 1` on the first two keyframes
(rest of the keyframes only had `transform`) while its inline style was
`opacity:0`. The element faded back to invisible by the end of the run — it
"disappeared" right as it arrived. A sibling element that set opacity on BOTH its
first and last keyframes never disappeared (that was the tell).

**Why:** per the WAAPI spec, property-specific keyframe lists get an implicit
start/end keyframe from the underlying value when the first/last real keyframe for
that property isn't at offset 0 / 1.

**How to apply:**
- If you animate a property, set it on BOTH the first and last keyframe, or
- Don't mix it into a transform-only keyframe track at all — drive
  visibility with a separate, dedicated 2-keyframe animation
  (`[{opacity:0},{opacity:1}]`, both ends set, `fill:'both'`).
- This is latent in the in-app splash (`MusterSplash.tsx`) too, but masked there
  because that animation is single-pass, drifts figures off-screen, and fades the
  whole screen at the end. It only became visible when the same motion was reused
  in a looping, on-screen marketing animation (`client/public/muster-drop-run.html`).

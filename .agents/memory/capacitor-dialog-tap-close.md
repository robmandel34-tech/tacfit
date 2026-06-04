---
name: Capacitor iOS dialog "closes out" on tap/Next
description: Radix Dialog auto-dismisses from inside taps in iOS WKWebView; fix with onInteractOutside/onPointerDownOutside preventDefault
---

Radix `Dialog` with `onOpenChange={onClose}` will spuriously close on iOS
(Capacitor/WKWebView) when the user taps a control inside it — e.g. a "Next"
button in a multi-step modal. Radix misclassifies the pointer event as a
press-outside and fires `onOpenChange(false)`.

**Fix:** add both guards to `DialogContent`:
`onInteractOutside={(e) => e.preventDefault()}` and
`onPointerDownOutside={(e) => e.preventDefault()}`. The dialog then only closes
via its explicit buttons / the default X close (which still calls onOpenChange).

**Why:** the same bug hit the activity-submission modal and the onboarding
walkthrough. It only reproduces on native iOS, not desktop web, so it slips
through dev testing.

**How to apply:** any full-screen / multi-step Radix Dialog that ships in the
native iOS app should carry these two preventDefault guards by default.

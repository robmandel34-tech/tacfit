---
name: Capacitor plugin pods must be added manually
description: New Capacitor plugins need their CocoaPod added to ios/App/Podfile by hand
---

When adding a new Capacitor plugin to TacFit, you MUST manually add its pod to
`ios/App/Podfile` (the `capacitor_pods` group), e.g.
`pod 'CapacitorPreferences', :path => '../../node_modules/@capacitor/preferences'`.

**Why:** The iOS app is built by Codemagic from the committed `ios/` folder, and
`codemagic.yaml` only runs `npx cap copy ios` (web assets) — never `npx cap sync`.
So a plugin not listed in the Podfile is never compiled into the binary; its
native calls then no-op/throw at runtime (seen with the HealthKit and Preferences
plugins — caused "not available" and silent auth-token loss / 401s on native).

**How to apply:** Any task that installs a Capacitor plugin (or relies on one for
native behavior) must also patch `ios/App/Podfile`. `cap copy` will not do it.

---
name: TestFlight upload rejections (version train + URL schemes)
description: Two recurring App Store Connect upload failures after a successful Codemagic build, and how to fix each.
---

The Codemagic archive/sign step can SUCCEED and still fail at the final
"publish to App Store Connect" step. Two failures seen, both fixed in the
committed `ios/` files:

**1. "Invalid Pre-Release Train. The train version 'X.Y.Z' is closed for new
build submissions" (iris code 90186).**
- Cause: the app's MARKETING_VERSION (CFBundleShortVersionString) matches a
  version whose TestFlight train is already closed/released in App Store
  Connect. Bumping only the build number is NOT enough — App Store Connect keys
  the "train" off the marketing version.
- Fix: bump `MARKETING_VERSION` (two occurrences, Debug + Release) in
  `ios/App/App.xcodeproj/project.pbxproj` to a new version (e.g. 1.0.1 → 1.0.2).
  Codemagic's `agvtool new-version -all $BUILD_NUMBER` only sets the build
  number; the marketing version is hardcoded in the pbxproj and must be edited
  by hand for each new release train.

**2. "URL schemes found in your app are not in the correct format:
[REPLACE_WITH_REVERSED_GOOGLE_IOS_CLIENT_ID]" (iris code 90158).**
- Cause: the Google Sign-In placeholder URL scheme in
  `ios/App/App/Info.plist` (`CFBundleURLTypes` → a `google-signin` dict) was
  never replaced with a real reversed iOS OAuth client id. App Store Connect
  rejects the placeholder because it isn't a valid RFC1738 scheme.
- Fix when Google native sign-in is NOT set up yet: remove that `google-signin`
  dict entirely (keep the `tacfitapp` scheme). When Google IS set up later, add
  a dict whose scheme is the real `com.googleusercontent.apps.<...>` reversed
  client id. Never ship the `REPLACE_WITH_...` placeholder.

**Why it matters:** these only surface at upload time, long after the slow
(~15-25 min) build, so catch both BEFORE pushing: bump the marketing version for
every new release, and never leave an unresolved `REPLACE_WITH_...` URL scheme
in Info.plist.

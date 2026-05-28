#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Patches ios/App/App/Info.plist with all required Apple permission strings.
# Run this once after `npx cap add ios`, or it's called automatically by cap-build.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

PLIST="ios/App/App/Info.plist"

if [ ! -f "$PLIST" ]; then
  echo "ERROR: $PLIST not found. Run 'npx cap add ios' first."
  exit 1
fi

echo "→ Patching Info.plist with permission usage descriptions..."

set_plist_entry() {
  local KEY="$1"
  local VALUE="$2"
  # Always set (add or overwrite). This guarantees the key is present in
  # the shipped binary, which Apple absolutely requires — a missing
  # NSCameraUsageDescription kills the app the instant the camera launches.
  if /usr/libexec/PlistBuddy -c "Print :$KEY" "$PLIST" &>/dev/null; then
    /usr/libexec/PlistBuddy -c "Set :$KEY $VALUE" "$PLIST"
    echo "  Set:   $KEY"
  else
    /usr/libexec/PlistBuddy -c "Add :$KEY string $VALUE" "$PLIST"
    echo "  Added: $KEY"
  fi
}

# Back-compat name in case anyone has older notes/scripts calling this.
add_plist_entry() { set_plist_entry "$@"; }

set_plist_entry "NSCameraUsageDescription" \
  "TacFit uses your camera to capture activity evidence photos and videos."

set_plist_entry "NSPhotoLibraryUsageDescription" \
  "TacFit accesses your photo library so you can choose activity evidence from your existing photos."

set_plist_entry "NSPhotoLibraryAddUsageDescription" \
  "TacFit can save activity evidence photos to your photo library."

set_plist_entry "NSMicrophoneUsageDescription" \
  "TacFit uses your microphone when recording activity evidence videos."

set_plist_entry "NSHealthShareUsageDescription" \
  "TacFit reads your Apple Health data to automatically import workout activities."

set_plist_entry "NSHealthUpdateUsageDescription" \
  "TacFit can write completed workouts back to Apple Health."

# NOTE: NSUserNotificationsUsageDescription is NOT a real iOS key — push
# notifications are handled via the system permission prompt, no Info.plist
# entry is needed. If you ever add ad/analytics tracking SDKs, add
# NSUserTrackingUsageDescription here AND call ATTrackingManager in app.

# Encryption-export compliance: TacFit only uses HTTPS + Apple-provided crypto
# (no custom algorithms), which is exempt from US export rules. Declaring this
# in Info.plist makes App Store Connect stop asking the question on every
# upload. If you ever add custom/proprietary cryptography, flip this to "true"
# and file an annual self-classification report (ERN) with BIS.
set_plist_bool_entry() {
  local KEY="$1"
  local VALUE="$2"
  if /usr/libexec/PlistBuddy -c "Print :$KEY" "$PLIST" &>/dev/null; then
    /usr/libexec/PlistBuddy -c "Set :$KEY $VALUE" "$PLIST"
    echo "  Set:   $KEY (bool)"
  else
    /usr/libexec/PlistBuddy -c "Add :$KEY bool $VALUE" "$PLIST"
    echo "  Added: $KEY (bool)"
  fi
}
set_plist_bool_entry "ITSAppUsesNonExemptEncryption" "false"

echo "✓ Info.plist permissions patched."

# Verification: fail loudly if any required key is still missing. This
# prevents a build that would crash on launch from ever reaching TestFlight.
REQUIRED_KEYS=(
  NSCameraUsageDescription
  NSPhotoLibraryUsageDescription
  NSPhotoLibraryAddUsageDescription
  NSMicrophoneUsageDescription
  NSHealthShareUsageDescription
  NSHealthUpdateUsageDescription
)
MISSING=0
for KEY in "${REQUIRED_KEYS[@]}"; do
  if ! /usr/libexec/PlistBuddy -c "Print :$KEY" "$PLIST" &>/dev/null; then
    echo "ERROR: $KEY is missing from $PLIST"
    MISSING=1
  fi
done
if [ "$MISSING" -ne 0 ]; then
  echo "✗ One or more required usage descriptions are missing. Aborting build."
  exit 1
fi
echo "✓ All required usage descriptions present."

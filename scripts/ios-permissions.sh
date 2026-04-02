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

add_plist_entry() {
  local KEY="$1"
  local VALUE="$2"
  # Only add if the key doesn't already exist
  if ! /usr/libexec/PlistBuddy -c "Print :$KEY" "$PLIST" &>/dev/null; then
    /usr/libexec/PlistBuddy -c "Add :$KEY string '$VALUE'" "$PLIST"
    echo "  Added: $KEY"
  else
    echo "  Exists: $KEY (skipped)"
  fi
}

add_plist_entry "NSCameraUsageDescription" \
  "TacFit uses your camera to capture activity evidence photos and videos."

add_plist_entry "NSPhotoLibraryUsageDescription" \
  "TacFit accesses your photo library so you can choose activity evidence from your existing photos."

add_plist_entry "NSPhotoLibraryAddUsageDescription" \
  "TacFit can save activity evidence photos to your photo library."

add_plist_entry "NSMicrophoneUsageDescription" \
  "TacFit uses your microphone when recording activity evidence videos."

add_plist_entry "NSHealthShareUsageDescription" \
  "TacFit reads your Apple Health data to automatically import workout activities."

add_plist_entry "NSHealthUpdateUsageDescription" \
  "TacFit can write completed workouts back to Apple Health."

add_plist_entry "NSUserNotificationsUsageDescription" \
  "TacFit sends notifications for team activity, competition updates, and mission tasks."

echo "✓ Info.plist permissions patched."

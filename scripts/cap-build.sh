#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# TacFit Capacitor iOS Build Script
# Run this on your Mac after cloning the project.
#
# Usage:
#   VITE_API_URL=https://your-backend.replit.app bash scripts/cap-build.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

if [ -z "$VITE_API_URL" ]; then
  echo "ERROR: VITE_API_URL is not set."
  echo "Usage: VITE_API_URL=https://your-backend.replit.app bash scripts/cap-build.sh"
  exit 1
fi

echo "→ Building frontend with API base: $VITE_API_URL"
VITE_API_URL="$VITE_API_URL" npx vite build

echo "→ Adding iOS platform (skip if already added)..."
if [ ! -d "ios" ]; then
  npx cap add ios
fi

# IMPORTANT: re-patch Info.plist on EVERY build. Previously this only ran
# on first `cap add ios`, which meant a project that added iOS before this
# script existed shipped without NSCameraUsageDescription and crashed on
# Take Photo during App Store review. Running it every build also catches
# the case where someone manually edits Info.plist and drops a key.
echo "→ Patching Info.plist permissions (every build)..."
bash scripts/ios-permissions.sh

# Copy the TacFit splash master into the iOS asset catalog so the launch
# screen shows the TacFit shield instead of the default Capacitor splash.
SPLASH_SRC="scripts/assets/ios-splash-master.png"
SPLASH_DST_DIR="ios/App/App/Assets.xcassets/Splash.imageset"
if [ -f "$SPLASH_SRC" ] && [ -d "$SPLASH_DST_DIR" ]; then
  echo "→ Installing TacFit splash into iOS asset catalog..."
  cp "$SPLASH_SRC" "$SPLASH_DST_DIR/splash-2732x2732.png"
  cp "$SPLASH_SRC" "$SPLASH_DST_DIR/splash-2732x2732-1.png"
  cp "$SPLASH_SRC" "$SPLASH_DST_DIR/splash-2732x2732-2.png"
fi

echo "→ Syncing Capacitor..."
npx cap sync ios

echo ""
echo "✓ Build complete. Open Xcode with:"
echo "    npx cap open ios"
echo ""
echo "In Xcode:"
echo "  1. Select your Team under Signing & Capabilities"
echo "  2. Set your Bundle Identifier (currently: com.tacfit.app)"
echo "  3. Product → Archive → Distribute App"

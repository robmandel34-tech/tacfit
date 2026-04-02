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
  bash scripts/ios-permissions.sh
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

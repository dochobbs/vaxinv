#!/bin/bash
set -euo pipefail

# VaxInv Standalone Build Script
# Builds a macOS .app bundle containing the pkg binary

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist-standalone"
APP_NAME="VaxInv"
TARGET="${1:-node22-macos-arm64}"

# Extract target Node major version from pkg target (e.g., node22-macos-arm64 → 22)
NODE_MAJOR=$(echo "$TARGET" | sed 's/node\([0-9]*\).*/\1/')

echo ""
echo "========================================"
echo "  Building VaxInv Standalone App"
echo "========================================"
echo ""
echo "Target: $TARGET (Node $NODE_MAJOR)"
echo ""

# Step 1: Build frontend
echo "[1/6] Building frontend..."
cd "$ROOT_DIR/frontend"
npm run build
echo "  Frontend built successfully"
echo ""

# Step 2: Clean previous build
echo "[2/6] Cleaning previous build..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"
echo "  Cleaned"
echo ""

# Step 3: Download Node 22-compatible native addons
echo "[3/6] Fetching native addons for Node $NODE_MAJOR..."

ADDON_DIR="$DIST_DIR/addons"
mkdir -p "$ADDON_DIR"

# Download better-sqlite3 prebuilt for target Node version
SQLITE_PKG_DIR="$ROOT_DIR/backend/node_modules/better-sqlite3"
SQLITE_ADDON=$(find "$SQLITE_PKG_DIR" -name "better_sqlite3.node" -type f | head -1)
if [ -n "$SQLITE_ADDON" ]; then
  # Save the current (dev) addon
  cp "$SQLITE_ADDON" "$ADDON_DIR/better_sqlite3_dev.node"
  # Download the prebuilt for the target Node version
  cd "$SQLITE_PKG_DIR"
  npx prebuild-install --runtime node --target "${NODE_MAJOR}.0.0" --arch arm64 --platform darwin 2>&1 || true
  cp "$SQLITE_ADDON" "$ADDON_DIR/better_sqlite3.node"
  # Restore dev addon
  cp "$ADDON_DIR/better_sqlite3_dev.node" "$SQLITE_ADDON"
  echo "  Fetched better_sqlite3.node for Node $NODE_MAJOR"
else
  echo "  WARNING: better_sqlite3.node not found in node_modules"
fi

# bcrypt uses N-API (ABI-stable across Node versions) — just copy it
BCRYPT_ADDON=$(find "$ROOT_DIR/backend/node_modules/bcrypt" -name "bcrypt_lib.node" -type f | head -1)
if [ -n "$BCRYPT_ADDON" ]; then
  cp "$BCRYPT_ADDON" "$ADDON_DIR/bcrypt_lib.node"
  echo "  Copied bcrypt_lib.node (N-API, ABI-stable)"
else
  echo "  WARNING: bcrypt_lib.node not found in node_modules"
fi

# Stash native addons out of node_modules so pkg can't trace them into snapshot
mv "$SQLITE_ADDON" "$ADDON_DIR/better_sqlite3_stash.node" 2>/dev/null || true
BCRYPT_NODE=$(find "$ROOT_DIR/backend/node_modules/bcrypt" -name "bcrypt_lib.node" -type f | head -1)
[ -n "$BCRYPT_NODE" ] && mv "$BCRYPT_NODE" "$ADDON_DIR/bcrypt_lib_stash.node"
echo ""

# Step 4: Run pkg to create standalone binary
echo "[4/6] Packaging binary with @yao-pkg/pkg..."
cd "$ROOT_DIR"
npx @yao-pkg/pkg . --target "$TARGET" --output "$DIST_DIR/$APP_NAME"
echo "  Binary created: $DIST_DIR/$APP_NAME"
echo ""

# Step 5: Restore native addons to node_modules (for dev use)
echo "[5/6] Restoring native addons..."
[ -f "$ADDON_DIR/better_sqlite3_stash.node" ] && mv "$ADDON_DIR/better_sqlite3_stash.node" "$SQLITE_ADDON" && echo "  Restored better_sqlite3.node"
[ -f "$ADDON_DIR/bcrypt_lib_stash.node" ] && [ -n "$BCRYPT_NODE" ] && mv "$ADDON_DIR/bcrypt_lib_stash.node" "$BCRYPT_NODE" && echo "  Restored bcrypt_lib.node"
echo ""

# Step 6: Assemble macOS .app bundle
echo "[6/6] Assembling macOS .app bundle..."
APP_DIR="$DIST_DIR/$APP_NAME.app"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"

mkdir -p "$MACOS_DIR" "$RESOURCES_DIR"

# Copy Info.plist
cp "$SCRIPT_DIR/macos/Info.plist" "$CONTENTS_DIR/Info.plist"

# Copy wrapper script and make executable
cp "$SCRIPT_DIR/macos/vaxinv-wrapper.sh" "$MACOS_DIR/$APP_NAME"
chmod +x "$MACOS_DIR/$APP_NAME"

# Copy icon
cp "$SCRIPT_DIR/macos/VaxInv.icns" "$RESOURCES_DIR/VaxInv.icns"

# Move binary and Node 22 native addons into Resources
mv "$DIST_DIR/$APP_NAME" "$RESOURCES_DIR/$APP_NAME"
[ -f "$ADDON_DIR/better_sqlite3.node" ] && mv "$ADDON_DIR/better_sqlite3.node" "$RESOURCES_DIR/"
[ -f "$ADDON_DIR/bcrypt_lib.node" ] && mv "$ADDON_DIR/bcrypt_lib.node" "$RESOURCES_DIR/"

# Clean up
rm -rf "$ADDON_DIR"

echo "  $APP_NAME.app assembled"
echo ""

echo "========================================"
echo "  Build Complete!"
echo "========================================"
echo ""
echo "Outputs:"
echo "  App bundle:  $APP_DIR"
echo "  Binary only: $RESOURCES_DIR/$APP_NAME"
echo ""
echo "To run the app:"
echo "  open $APP_DIR"
echo ""
echo "Note: On first launch, macOS Gatekeeper may block the unsigned app."
echo "Right-click -> Open -> Open to bypass."
echo ""

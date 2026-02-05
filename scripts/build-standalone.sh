#!/bin/bash
set -euo pipefail

# VaxInv Standalone Build Script
# Builds a macOS .app bundle containing the pkg binary

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist-standalone"
APP_NAME="VaxInv"
TARGET="${1:-node22-macos-arm64}"

echo ""
echo "========================================"
echo "  Building VaxInv Standalone App"
echo "========================================"
echo ""
echo "Target: $TARGET"
echo ""

# Step 1: Build frontend
echo "[1/5] Building frontend..."
cd "$ROOT_DIR/frontend"
npm run build
echo "  Frontend built successfully"
echo ""

# Step 2: Clean previous build
echo "[2/5] Cleaning previous build..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"
echo "  Cleaned"
echo ""

# Step 3: Run pkg to create standalone binary
echo "[3/5] Packaging binary with @yao-pkg/pkg..."
cd "$ROOT_DIR"
npx @yao-pkg/pkg . --target "$TARGET" --output "$DIST_DIR/$APP_NAME"
echo "  Binary created: $DIST_DIR/$APP_NAME"
echo ""

# Step 4: Copy native addons next to binary
echo "[4/5] Copying native addons..."

# Find and copy better-sqlite3 native addon
SQLITE_ADDON=$(find "$ROOT_DIR/backend/node_modules/better-sqlite3" -name "better_sqlite3.node" -type f | head -1)
if [ -n "$SQLITE_ADDON" ]; then
  cp "$SQLITE_ADDON" "$DIST_DIR/better_sqlite3.node"
  echo "  Copied better_sqlite3.node"
else
  echo "  WARNING: better_sqlite3.node not found"
fi

# Find and copy bcrypt native addon
BCRYPT_ADDON=$(find "$ROOT_DIR/backend/node_modules/bcrypt" -name "bcrypt_lib.node" -type f | head -1)
if [ -n "$BCRYPT_ADDON" ]; then
  cp "$BCRYPT_ADDON" "$DIST_DIR/bcrypt_lib.node"
  echo "  Copied bcrypt_lib.node"
else
  echo "  WARNING: bcrypt_lib.node not found"
fi

echo ""

# Step 5: Assemble macOS .app bundle
echo "[5/5] Assembling macOS .app bundle..."
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

# Move binary and native addons into Resources
mv "$DIST_DIR/$APP_NAME" "$RESOURCES_DIR/$APP_NAME"
[ -f "$DIST_DIR/better_sqlite3.node" ] && mv "$DIST_DIR/better_sqlite3.node" "$RESOURCES_DIR/"
[ -f "$DIST_DIR/bcrypt_lib.node" ] && mv "$DIST_DIR/bcrypt_lib.node" "$RESOURCES_DIR/"

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

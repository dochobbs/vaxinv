#!/bin/bash
# VaxInv macOS .app wrapper
# Sets data directory and launches the pkg binary
DIR="$(cd "$(dirname "$0")/.." && pwd)"
export VAXINV_DATA_DIR="$HOME/Library/Application Support/VaxInv"
exec "$DIR/Resources/VaxInv"

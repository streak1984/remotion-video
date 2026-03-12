#!/usr/bin/env bash
# Validates prerequisites for the Remotion video plugin.
# Runs on SessionStart via hooks.json.

set -e

errors=0

# Check Node.js version (18+)
if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_VERSION" -lt 18 ]; then
    echo "[remotion-video] WARNING: Node.js 18+ required, found v$(node -v)" >&2
    errors=$((errors + 1))
  fi
else
  echo "[remotion-video] WARNING: Node.js not found. Install Node.js 18+ to use this plugin." >&2
  errors=$((errors + 1))
fi

if [ "$errors" -gt 0 ]; then
  echo "[remotion-video] $errors prerequisite(s) missing. Some features may not work." >&2
fi

exit 0

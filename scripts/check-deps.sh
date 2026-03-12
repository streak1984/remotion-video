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

# Check for Chrome/Chromium (needed by Remotion for rendering)
CHROME_FOUND=0
for chrome_cmd in "google-chrome" "google-chrome-stable" "chromium" "chromium-browser"; do
  if command -v "$chrome_cmd" &> /dev/null; then
    CHROME_FOUND=1
    break
  fi
done

# Also check macOS Chrome app locations
if [ "$CHROME_FOUND" -eq 0 ]; then
  if [ -d "/Applications/Google Chrome.app" ] || [ -d "/Applications/Chromium.app" ]; then
    CHROME_FOUND=1
  fi
fi

if [ "$CHROME_FOUND" -eq 0 ]; then
  echo "[remotion-video] WARNING: Chrome/Chromium not found. Required for video rendering." >&2
  errors=$((errors + 1))
fi

# Check for ffmpeg
if ! command -v ffmpeg &> /dev/null; then
  echo "[remotion-video] WARNING: ffmpeg not found. Required for video encoding. Install with: brew install ffmpeg" >&2
  errors=$((errors + 1))
fi

# Check for ANTHROPIC_API_KEY
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "[remotion-video] WARNING: ANTHROPIC_API_KEY not set. Required for Claude AI subtitle generation." >&2
  errors=$((errors + 1))
fi

if [ "$errors" -gt 0 ]; then
  echo "[remotion-video] $errors prerequisite(s) missing. Some features may not work." >&2
fi

exit 0

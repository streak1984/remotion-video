#!/usr/bin/env bash
# Startup script for the Remotion video MCP server.
# Installs dependencies if needed, then launches the server.
set -e

PLUGIN_ROOT="${REMOTION_PROJECT_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$PLUGIN_ROOT"

# Install main project dependencies if missing
if [ ! -d "node_modules" ]; then
  npm install --ignore-scripts --silent 2>/dev/null
fi

# Install MCP server dependencies if missing
if [ ! -d "server/node_modules" ]; then
  cd server && npm install --ignore-scripts --silent 2>/dev/null && cd ..
fi

exec npx tsx server/src/index.ts

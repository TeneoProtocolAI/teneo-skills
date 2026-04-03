#!/bin/sh
set -e

# ──────────────────────────────────────────────────────────────
# Teneo Protocol CLI installer (macOS / Linux)
#
# Usage:
#   sh install.sh          (from plugin root)
#   sh cli/install.sh      (from plugin root)
#
# What it does:
#   1. Creates ~/teneo-skill/
#   2. Copies prebuilt CLI assets from the plugin's cli/ directory when available
#   3. Falls back to TypeScript source + npm dependencies only when bundles are missing
#   4. Creates a wrapper at ~/teneo-skill/teneo with a 1 day daemon idle timeout
#   5. Starts the daemon immediately
#
# After install, run commands with:
#   ~/teneo-skill/teneo daemon status
#   ~/teneo-skill/teneo list-agents
#   ~/teneo-skill/teneo health
# ──────────────────────────────────────────────────────────────

INSTALL_DIR="$HOME/teneo-skill"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DAEMON_IDLE_TIMEOUT_MS="86400000"

# Locate the cli/ directory — works whether run from root or cli/
if [ -f "$SCRIPT_DIR/cli/greetings.install.md" ]; then
  CLI_DIR="$SCRIPT_DIR/cli"
elif [ -f "$SCRIPT_DIR/greetings.install.md" ]; then
  CLI_DIR="$SCRIPT_DIR"
else
  echo "Error: Cannot find CLI assets." >&2
  echo "Run this script from the plugin directory: sh install.sh" >&2
  exit 1
fi

# ── Preflight ─────────────────────────────────────────────────

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is required but not installed." >&2
  echo "Install Node.js 18+ from https://nodejs.org" >&2
  exit 1
fi

NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 18 ] 2>/dev/null; then
  echo "Error: Node.js 18+ required, found v$(node --version)" >&2
  exit 1
fi

if [ ! -f "$CLI_DIR/greetings.install.md" ]; then
  echo "Error: greetings.install.md not found in $CLI_DIR" >&2
  exit 1
fi

USE_PREBUILT=0
if [ -f "$CLI_DIR/teneo.mjs" ] && [ -f "$CLI_DIR/daemon.mjs" ]; then
  USE_PREBUILT=1
elif [ ! -f "$CLI_DIR/index.ts" ] || [ ! -f "$CLI_DIR/daemon.ts" ]; then
  echo "Error: No prebuilt CLI bundles or TypeScript source found in $CLI_DIR" >&2
  exit 1
fi

# ── Install ───────────────────────────────────────────────────

echo "Installing Teneo CLI to $INSTALL_DIR ..."

mkdir -p "$INSTALL_DIR"

if [ "$USE_PREBUILT" -eq 1 ]; then
  cp "$CLI_DIR/teneo.mjs" "$INSTALL_DIR/teneo.mjs"
  cp "$CLI_DIR/daemon.mjs" "$INSTALL_DIR/daemon.mjs"
  cp "$CLI_DIR/greetings.install.md" "$INSTALL_DIR/greetings.install.md"
  echo "  Copied prebuilt CLI bundles"
else
  cp "$CLI_DIR/index.ts" "$INSTALL_DIR/teneo.ts"
  cp "$CLI_DIR/daemon.ts" "$INSTALL_DIR/daemon.ts"
  cp "$CLI_DIR/greetings.install.md" "$INSTALL_DIR/greetings.install.md"
  echo "  Copied teneo.ts, daemon.ts, and greetings.install.md"

  cd "$INSTALL_DIR"
  if [ ! -f package.json ]; then
    npm init -y > /dev/null 2>&1
  fi

  echo "  Installing npm dependencies (fallback path; this may take a minute)..."
  NODE_OPTIONS="--max-old-space-size=512" npm install --prefer-offline \
    @teneo-protocol/sdk@latest \
    commander@^12.1.0 \
    dotenv@^16.0.0 \
    viem@^2.21.0 \
    tsx@^4.0.0 \
    > /dev/null 2>&1
  echo "  Dependencies installed"
fi

if [ "$USE_PREBUILT" -eq 1 ]; then
  printf '#!/bin/bash\n: "${TENEO_DAEMON_IDLE_TIMEOUT_MS:=86400000}"\nexport TENEO_DAEMON_IDLE_TIMEOUT_MS\nexec node "%s/teneo.mjs" "$@"\n' "$INSTALL_DIR" > "$INSTALL_DIR/teneo"
else
  printf '#!/bin/bash\n: "${TENEO_DAEMON_IDLE_TIMEOUT_MS:=86400000}"\nexport TENEO_DAEMON_IDLE_TIMEOUT_MS\nexec npx tsx "%s/teneo.ts" "$@"\n' "$INSTALL_DIR" > "$INSTALL_DIR/teneo"
fi
chmod +x "$INSTALL_DIR/teneo"
echo "  Created wrapper script"

if "$INSTALL_DIR/teneo" daemon stop >/dev/null 2>&1; then :; fi
if "$INSTALL_DIR/teneo" daemon start --json >/dev/null 2>&1; then
  echo "  Daemon started (1 day idle timeout)"
else
  echo "  Daemon auto-start skipped; run ~/teneo-skill/teneo daemon start"
fi

# ── Verify ────────────────────────────────────────────────────

echo ""
echo "Teneo CLI installed to $INSTALL_DIR"
echo ""
echo "Files:"
if [ "$USE_PREBUILT" -eq 1 ]; then
  echo "  $INSTALL_DIR/teneo.mjs   CLI bundle"
  echo "  $INSTALL_DIR/daemon.mjs  Background daemon bundle"
else
  echo "  $INSTALL_DIR/teneo.ts    CLI source"
  echo "  $INSTALL_DIR/daemon.ts   Background daemon"
fi
echo "  $INSTALL_DIR/teneo       Wrapper (run this)"
echo ""
echo "Usage:"
echo "  ~/teneo-skill/teneo daemon status"
echo "  ~/teneo-skill/teneo list-agents"
echo "  ~/teneo-skill/teneo health"
echo ""
if [ -f "$INSTALL_DIR/greetings.install.md" ]; then
  sed \
    -e 's/^### \{0,1\}//' \
    -e 's/^## \{0,1\}//' \
    -e 's/`//g' \
    "$INSTALL_DIR/greetings.install.md"
  echo ""
fi

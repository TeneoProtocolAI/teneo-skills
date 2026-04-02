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
#   2. Copies teneo.ts, daemon.ts, and greetings.install.md from the plugin's cli/ directory
#   3. Installs npm dependencies
#   4. Creates a bash wrapper at ~/teneo-skill/teneo
#
# After install, run commands with:
#   ~/teneo-skill/teneo list-agents
#   ~/teneo-skill/teneo health
# ──────────────────────────────────────────────────────────────

INSTALL_DIR="$HOME/teneo-skill"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Locate the cli/ directory — works whether run from root or cli/
if [ -f "$SCRIPT_DIR/cli/index.ts" ]; then
  CLI_DIR="$SCRIPT_DIR/cli"
elif [ -f "$SCRIPT_DIR/index.ts" ]; then
  CLI_DIR="$SCRIPT_DIR"
else
  echo "Error: Cannot find CLI source files (index.ts, daemon.ts)." >&2
  echo "Run this script from the plugin directory: sh install.sh" >&2
  exit 1
fi

# ── Preflight ─────────────────────────────────────────────────

# Check Node.js 18+
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

# Verify source files
if [ ! -f "$CLI_DIR/index.ts" ] || [ ! -f "$CLI_DIR/daemon.ts" ] || [ ! -f "$CLI_DIR/greetings.install.md" ]; then
  echo "Error: index.ts, daemon.ts, or greetings.install.md not found in $CLI_DIR" >&2
  exit 1
fi

# ── Install ───────────────────────────────────────────────────

echo "Installing Teneo CLI to $INSTALL_DIR ..."

mkdir -p "$INSTALL_DIR"

# Copy TypeScript source files
cp "$CLI_DIR/index.ts" "$INSTALL_DIR/teneo.ts"
cp "$CLI_DIR/daemon.ts" "$INSTALL_DIR/daemon.ts"
cp "$CLI_DIR/greetings.install.md" "$INSTALL_DIR/greetings.install.md"
echo "  Copied teneo.ts, daemon.ts, and greetings.install.md"

# Initialize npm and install dependencies
cd "$INSTALL_DIR"
if [ ! -f package.json ]; then
  npm init -y > /dev/null 2>&1
fi

echo "  Installing npm dependencies (this may take a minute)..."
NODE_OPTIONS="--max-old-space-size=512" npm install --prefer-offline \
  @teneo-protocol/sdk@latest \
  commander@^12.1.0 \
  dotenv@^16.0.0 \
  viem@^2.21.0 \
  tsx@^4.0.0 \
  > /dev/null 2>&1
echo "  Dependencies installed"

# Create bash wrapper
printf '#!/bin/bash\ncd ~/teneo-skill && exec npx tsx teneo.ts "$@"\n' > "$INSTALL_DIR/teneo"
chmod +x "$INSTALL_DIR/teneo"
echo "  Created wrapper script"

# ── Verify ────────────────────────────────────────────────────

echo ""
echo "Teneo CLI installed to $INSTALL_DIR"
echo ""
echo "Files:"
echo "  $INSTALL_DIR/teneo.ts    CLI source"
echo "  $INSTALL_DIR/daemon.ts   Background daemon"
echo "  $INSTALL_DIR/teneo       Wrapper (run this)"
echo ""
echo "Usage:"
echo "  ~/teneo-skill/teneo health"
echo "  ~/teneo-skill/teneo list-agents"
echo "  ~/teneo-skill/teneo discover"
echo ""
if [ -f "$INSTALL_DIR/greetings.install.md" ]; then
  sed \
    -e 's/^### \{0,1\}//' \
    -e 's/^## \{0,1\}//' \
    -e 's/`//g' \
    "$INSTALL_DIR/greetings.install.md"
  echo ""
fi

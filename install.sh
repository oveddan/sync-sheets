#!/bin/bash
set -e

SKILL_DIR="$HOME/.claude/skills/sync-sheets"
CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

echo "Installing sync-sheets MCP server..."

# 1. Clone or update the skill directory
if [ -d "$SKILL_DIR/.git" ]; then
  echo "Updating existing installation..."
  git -C "$SKILL_DIR" pull --ff-only
else
  echo "Cloning sync-sheets..."
  mkdir -p "$(dirname "$SKILL_DIR")"
  git clone https://github.com/oveddan/sync-sheets.git "$SKILL_DIR"
fi

# 2. Install dependencies
echo "Installing dependencies..."
cd "$SKILL_DIR"
npm install --silent

# 3. Patch Claude Desktop config
mkdir -p "$(dirname "$CONFIG_FILE")"

if [ ! -f "$CONFIG_FILE" ]; then
  echo '{}' > "$CONFIG_FILE"
fi

# Use node to safely merge the mcpServers entry
node -e "
const fs = require('fs');
const path = '$CONFIG_FILE';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));
config.mcpServers = config.mcpServers || {};
config.mcpServers['sync-sheets'] = {
  command: 'npx',
  args: ['tsx', '$SKILL_DIR/server.ts']
};
fs.writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
console.log('Config updated.');
"

echo ""
echo "Done! Restart Claude Desktop to activate the sync-sheets tools."
echo ""
echo "Tools available after restart:"
echo "  sheets_read    - Read a range"
echo "  sheets_write   - Overwrite a range"
echo "  sheets_append  - Append rows"
echo "  sheets_clear   - Clear a range"
echo ""
echo "First use: paste your Google Service Account JSON when prompted."

#!/bin/bash
set -e

SKILL_DIR="$HOME/.claude/skills/sync-sheets"
CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
CREDS_FILE="$SKILL_DIR/config.json"

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

chmod +x "$SKILL_DIR/start.sh"

# 2. Install dependencies
echo "Installing dependencies..."
cd "$SKILL_DIR"
npm install --silent

# 3. Prompt for credentials if not already saved
if [ ! -f "$CREDS_FILE" ]; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Google Service Account credentials required."
  echo ""
  echo "1. Go to https://console.cloud.google.com/iam-admin/serviceaccounts"
  echo "2. Create a service account (or use existing)"
  echo "3. Create a JSON key and download it"
  echo "4. Share your spreadsheet with the service account email as Editor"
  echo ""
  echo "Paste the full contents of the JSON key file below,"
  echo "then press Enter and Ctrl+D:"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  SA_JSON=$(cat)

  # Validate it looks like a service account
  if ! echo "$SA_JSON" | node -e "
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    if (d.type !== 'service_account' || !d.client_email || !d.private_key) {
      process.stderr.write('Error: does not look like a service account JSON\n');
      process.exit(1);
    }
  "; then
    echo "Aborting. Please re-run install.sh with a valid service account JSON."
    exit 1
  fi

  echo "$SA_JSON" | node -e "
    const sa = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const out = JSON.stringify({ googleServiceAccountJson: sa }, null, 2);
    require('fs').writeFileSync('$CREDS_FILE', out + '\n');
  "
  echo "Credentials saved to $CREDS_FILE"
else
  echo "Credentials already saved, skipping."
fi

# 4. Patch Claude Desktop config
mkdir -p "$(dirname "$CONFIG_FILE")"

if [ ! -f "$CONFIG_FILE" ]; then
  echo '{}' > "$CONFIG_FILE"
fi

node -e "
const fs = require('fs');
const path = '$CONFIG_FILE';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));
config.mcpServers = config.mcpServers || {};
config.mcpServers['sync-sheets'] = {
  command: '/bin/bash',
  args: ['$SKILL_DIR/start.sh']
};
fs.writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
console.log('Claude Desktop config updated.');
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Done! Restart Claude Desktop to activate sync-sheets."
echo ""
echo "Available tools:"
echo "  sheets_read    - Read a range"
echo "  sheets_write   - Overwrite a range"
echo "  sheets_append  - Append rows"
echo "  sheets_clear   - Clear a range"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

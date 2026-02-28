#!/bin/bash
# Wrapper so Claude Desktop runs server.ts from the correct directory,
# using the stable tsx path (not dependent on shell PATH).
cd "$(dirname "$0")"

# Try common stable locations for tsx/node
for TSX in \
  "$HOME/.local/share/fnm/node-versions/v25.2.1/installation/bin/tsx" \
  "/opt/homebrew/bin/tsx" \
  "/usr/local/bin/tsx" \
  "$(which tsx 2>/dev/null)"; do
  if [ -x "$TSX" ]; then
    exec "$TSX" server.ts
  fi
done

echo "Error: tsx not found. Install it with: npm install -g tsx" >&2
exit 1

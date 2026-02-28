#!/bin/bash
# Wrapper for Claude Desktop — sets PATH so node/tsx are found,
# then runs the MCP server from its own directory.
cd "$(dirname "$0")"

# Find the fnm node installation directory (stable path)
FNM_NODE_BIN=""
for dir in "$HOME/.local/share/fnm/node-versions"/*/installation/bin; do
  if [ -x "$dir/node" ]; then
    FNM_NODE_BIN="$dir"
    break
  fi
done

if [ -n "$FNM_NODE_BIN" ]; then
  export PATH="$FNM_NODE_BIN:$PATH"
elif [ -x "/opt/homebrew/bin/node" ]; then
  export PATH="/opt/homebrew/bin:$PATH"
elif [ -x "/usr/local/bin/node" ]; then
  export PATH="/usr/local/bin:$PATH"
else
  echo "Error: node not found" >&2
  exit 1
fi

exec npx tsx server.ts

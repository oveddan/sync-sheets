#!/bin/bash
# Wrapper so Claude Desktop runs server.ts from the correct directory
cd "$(dirname "$0")"
exec npx tsx server.ts

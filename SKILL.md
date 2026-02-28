# sync-sheets skill

A thin, generic API layer for reading from and writing to Google Sheets via the Google Sheets API.

## Setup (first run)

Check if `~/.claude/skills/sync-sheets/config.json` exists.

If it does NOT exist:
1. Tell the user: "To use the sync-sheets skill, you need a Google Service Account with access to your spreadsheet. Please paste your service account JSON below (the full contents of the .json file downloaded from Google Cloud Console)."
2. Wait for the user to paste the JSON.
3. Validate it looks like a service account (has `type: "service_account"`, `client_email`, `private_key`).
4. Save it to `~/.claude/skills/sync-sheets/config.json` as:
   ```json
   { "googleServiceAccountJson": { ...pasted object... } }
   ```
5. Confirm: "Credentials saved. You can now use sync-sheets commands."

## Usage (once configured)

Accept natural language commands from the user and translate them to operations. Run the script:

```bash
npx --yes tsx ~/.claude/skills/sync-sheets/run.ts [args]
```

### Supported operations:

**Read a range:**
```bash
npx --yes tsx ~/.claude/skills/sync-sheets/run.ts --op read --spreadsheetId SHEET_ID --range Sheet1!A1:Z100
```

**Write (overwrite) a range:**
```bash
npx --yes tsx ~/.claude/skills/sync-sheets/run.ts --op write --spreadsheetId SHEET_ID --range Sheet1!A1 --data '[[...]]'
```
`--data` must be a JSON array of arrays (rows × columns).

**Append rows:**
```bash
npx --yes tsx ~/.claude/skills/sync-sheets/run.ts --op append --spreadsheetId SHEET_ID --range Sheet1!A1 --data '[[...]]'
```

**Clear a range:**
```bash
npx --yes tsx ~/.claude/skills/sync-sheets/run.ts --op clear --spreadsheetId SHEET_ID --range Sheet1!A1:Z100
```

### Interpreting user commands:

- "Write [data] to spreadsheet [ID], sheet [name], starting at A1" → `--op write`
- "Append [rows] to sheet [name] in [spreadsheet ID]" → `--op append`
- "Clear range B2:D10 in sheet RSVPs of spreadsheet [ID]" → `--op clear`
- "Read range A1:Z50 from sheet [name]" → `--op read`

Always confirm with the user what spreadsheet ID and sheet name to use if not specified.

Range format: `SheetName!A1:Z100` or just `SheetName!A1` (for write/append start position).

## Using as an MCP Server (Claude Desktop or Claude Code)

`server.ts` is a stdio MCP server that exposes four tools:
`sheets_read`, `sheets_write`, `sheets_append`, `sheets_clear`.

### Claude Desktop

Add this to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sync-sheets": {
      "command": "npx",
      "args": ["tsx", "/Users/YOUR_USERNAME/.claude/skills/sync-sheets/server.ts"]
    }
  }
}
```

Replace `YOUR_USERNAME` with your macOS username. Then restart Claude Desktop.

### Claude Code

```bash
claude mcp add sync-sheets -- npx tsx ~/.claude/skills/sync-sheets/server.ts
```

### Credentials for MCP usage

The MCP server reads credentials from the same `~/.claude/skills/sync-sheets/config.json`.
Make sure it exists before starting the server (run `/sync-sheets` in Claude Code to set it up,
or create it manually):

```json
{ "googleServiceAccountJson": { ...service account object... } }
```

## Notes

- The service account must be shared as an editor on the target spreadsheet.
- All script output is printed as JSON.
- Credentials are stored locally and never leave the machine.

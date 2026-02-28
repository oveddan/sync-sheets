---
name: sync-sheets
description: Read from and write to Google Sheets. Use when the user wants to sync data, read spreadsheet values, write rows, append data, or clear a range.
disable-model-invocation: true
allowed-tools: Bash, Read, Write
---

# sync-sheets

A thin API layer for Google Sheets. Supports read, write, append, and clear.

## Credentials setup

Check if `~/.claude/skills/sync-sheets/config.json` exists:

Current config status: !`test -f ~/.claude/skills/sync-sheets/config.json && echo "EXISTS" || echo "MISSING"`

**If MISSING:** tell the user they need a Google Service Account JSON, then:
1. Ask them to paste the full contents of their `.json` key file
2. Validate it has `type: "service_account"`, `client_email`, and `private_key`
3. Save it with:
   ```bash
   node -e "
     const sa = /* pasted JSON */;
     require('fs').writeFileSync(
       require('os').homedir() + '/.claude/skills/sync-sheets/config.json',
       JSON.stringify({ googleServiceAccountJson: sa }, null, 2)
     );
   "
   ```
4. Confirm saved and proceed

**If EXISTS:** credentials are ready, proceed to the operation.

## Operations

Run via:
```bash
npx tsx ~/.claude/skills/sync-sheets/run.ts --op <op> --spreadsheetId <id> --range <range> [--data '<json>']
```

### Read
```bash
npx tsx ~/.claude/skills/sync-sheets/run.ts --op read --spreadsheetId SHEET_ID --range Sheet1!A1:Z100
```

### Write (overwrite)
```bash
npx tsx ~/.claude/skills/sync-sheets/run.ts --op write --spreadsheetId SHEET_ID --range Sheet1!A1 --data '[["col1","col2"],["val1","val2"]]'
```

### Append rows
```bash
npx tsx ~/.claude/skills/sync-sheets/run.ts --op append --spreadsheetId SHEET_ID --range Sheet1!A1 --data '[["val1","val2"]]'
```

### Clear a range
```bash
npx tsx ~/.claude/skills/sync-sheets/run.ts --op clear --spreadsheetId SHEET_ID --range Sheet1!A1:Z100
```

## Interpreting user commands

- "Write [data] to spreadsheet [ID] sheet [name]" → `--op write`
- "Append [rows] to sheet [name]" → `--op append`
- "Clear range B2:D10" → `--op clear`
- "Read range A1:Z50" → `--op read`

Always confirm spreadsheet ID and sheet name if not provided.
Range format: `SheetName!A1:Z100`

## Notes
- The service account must be shared as an **Editor** on the target spreadsheet
- `--data` must be a JSON array of arrays (rows × columns)
- Output is always printed as JSON

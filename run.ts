#!/usr/bin/env tsx
/**
 * sync-sheets/run.ts
 * Thin wrapper around the Google Sheets API.
 *
 * Usage:
 *   npx tsx run.ts --op read    --spreadsheetId ID --range Sheet1!A1:Z100
 *   npx tsx run.ts --op write   --spreadsheetId ID --range Sheet1!A1 --data '[[...]]'
 *   npx tsx run.ts --op append  --spreadsheetId ID --range Sheet1!A1 --data '[[...]]'
 *   npx tsx run.ts --op clear   --spreadsheetId ID --range Sheet1!A1:Z100
 */

import { google } from "googleapis";
import fs from "fs";
import path from "path";

// --- Parse args ---
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const op = getArg("op");
const spreadsheetId = getArg("spreadsheetId");
const range = getArg("range");
const dataArg = getArg("data");

if (!op || !spreadsheetId) {
  console.error(JSON.stringify({ error: "--op and --spreadsheetId are required" }));
  process.exit(1);
}

// --- Load credentials ---
const configPath = path.join(
  process.env.HOME ?? process.env.USERPROFILE ?? "~",
  ".claude",
  "skills",
  "sync-sheets",
  "config.json"
);

if (!fs.existsSync(configPath)) {
  console.error(
    JSON.stringify({
      error: "config.json not found. Run /sync-sheets in Claude Code to set up credentials.",
      configPath,
    })
  );
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const serviceAccountJson = config.googleServiceAccountJson;

if (!serviceAccountJson?.client_email || !serviceAccountJson?.private_key) {
  console.error(
    JSON.stringify({ error: "Invalid service account in config.json — missing client_email or private_key" })
  );
  process.exit(1);
}

// --- Authenticate ---
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccountJson,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// --- Execute operation ---
async function main() {
  switch (op) {
    case "read": {
      if (!range) {
        console.error(JSON.stringify({ error: "--range is required for read" }));
        process.exit(1);
      }
      const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
      console.log(JSON.stringify({ values: res.data.values ?? [], range: res.data.range }));
      break;
    }

    case "write": {
      if (!range || !dataArg) {
        console.error(JSON.stringify({ error: "--range and --data are required for write" }));
        process.exit(1);
      }
      const values = JSON.parse(dataArg);
      const res = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: { values },
      });
      console.log(
        JSON.stringify({
          updatedRange: res.data.updatedRange,
          updatedRows: res.data.updatedRows,
          updatedColumns: res.data.updatedColumns,
          updatedCells: res.data.updatedCells,
        })
      );
      break;
    }

    case "append": {
      if (!range || !dataArg) {
        console.error(JSON.stringify({ error: "--range and --data are required for append" }));
        process.exit(1);
      }
      const values = JSON.parse(dataArg);
      const res = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values },
      });
      console.log(
        JSON.stringify({
          updatedRange: res.data.updates?.updatedRange,
          updatedRows: res.data.updates?.updatedRows,
          updatedCells: res.data.updates?.updatedCells,
        })
      );
      break;
    }

    case "clear": {
      if (!range) {
        console.error(JSON.stringify({ error: "--range is required for clear" }));
        process.exit(1);
      }
      const res = await sheets.spreadsheets.values.clear({ spreadsheetId, range });
      console.log(JSON.stringify({ clearedRange: res.data.clearedRange }));
      break;
    }

    default:
      console.error(JSON.stringify({ error: `Unknown op: ${op}. Use read, write, append, or clear.` }));
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ error: err.message ?? String(err) }));
  process.exit(1);
});

#!/usr/bin/env tsx
/**
 * sync-sheets MCP server
 *
 * Exposes Google Sheets operations as MCP tools usable in Claude Desktop
 * and Claude Code.
 *
 * Credentials are read from ~/.claude/skills/sync-sheets/config.json
 * { "googleServiceAccountJson": { ...service account... } }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// --- Load credentials ---
const configPath = path.join(
  process.env.HOME ?? process.env.USERPROFILE ?? "~",
  ".claude",
  "skills",
  "sync-sheets",
  "config.json"
);

function getSheets() {
  if (!fs.existsSync(configPath)) {
    throw new Error(
      `config.json not found at ${configPath}. Paste your Google Service Account JSON into that file as: { "googleServiceAccountJson": { ... } }`
    );
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const sa = config.googleServiceAccountJson;
  if (!sa?.client_email || !sa?.private_key) {
    throw new Error("Invalid config.json — missing client_email or private_key in googleServiceAccountJson");
  }
  const auth = new google.auth.GoogleAuth({
    credentials: sa,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// --- Tool definitions ---
const TOOLS = [
  {
    name: "sheets_read",
    description: "Read values from a Google Sheets range.",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "The spreadsheet ID from the URL." },
        range: { type: "string", description: "A1 notation range, e.g. Sheet1!A1:Z100" },
      },
      required: ["spreadsheetId", "range"],
    },
  },
  {
    name: "sheets_write",
    description: "Overwrite a range in a Google Sheet with provided values.",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "The spreadsheet ID from the URL." },
        range: { type: "string", description: "Top-left cell to start writing, e.g. Sheet1!A1" },
        values: {
          type: "array",
          items: { type: "array" },
          description: "2D array of values (rows × columns).",
        },
      },
      required: ["spreadsheetId", "range", "values"],
    },
  },
  {
    name: "sheets_append",
    description: "Append rows to a Google Sheet after the last row with data.",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "The spreadsheet ID from the URL." },
        range: { type: "string", description: "Sheet range to append to, e.g. Sheet1!A1" },
        values: {
          type: "array",
          items: { type: "array" },
          description: "2D array of rows to append.",
        },
      },
      required: ["spreadsheetId", "range", "values"],
    },
  },
  {
    name: "sheets_clear",
    description: "Clear all values in a Google Sheets range.",
    inputSchema: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "The spreadsheet ID from the URL." },
        range: { type: "string", description: "A1 notation range to clear, e.g. Sheet1!A1:Z100" },
      },
      required: ["spreadsheetId", "range"],
    },
  },
];

// --- Server ---
const server = new Server(
  { name: "sync-sheets", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const sheets = getSheets();
  const { spreadsheetId, range, values } = args as {
    spreadsheetId: string;
    range: string;
    values?: unknown[][];
  };

  switch (name) {
    case "sheets_read": {
      const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
      return {
        content: [{ type: "text", text: JSON.stringify({ values: res.data.values ?? [], range: res.data.range }) }],
      };
    }

    case "sheets_write": {
      const res = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: values as string[][] },
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            updatedRange: res.data.updatedRange,
            updatedRows: res.data.updatedRows,
            updatedCells: res.data.updatedCells,
          }),
        }],
      };
    }

    case "sheets_append": {
      const res = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: values as string[][] },
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            updatedRange: res.data.updates?.updatedRange,
            updatedRows: res.data.updates?.updatedRows,
            updatedCells: res.data.updates?.updatedCells,
          }),
        }],
      };
    }

    case "sheets_clear": {
      const res = await sheets.spreadsheets.values.clear({ spreadsheetId, range });
      return {
        content: [{ type: "text", text: JSON.stringify({ clearedRange: res.data.clearedRange }) }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// --- Start ---
const transport = new StdioServerTransport();
await server.connect(transport);

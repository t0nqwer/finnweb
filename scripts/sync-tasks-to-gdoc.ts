import fs from "fs/promises";
import path from "path";
import process from "process";

import chokidar from "chokidar";
import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();

type TaskStatus = "todo" | "in_progress" | "done" | string;

type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  priority?: string;
  scope?: string[];
  acceptanceCriteria?: string[];
  progressNotes?: string[];
};

type TasksFile = {
  updatedAt?: string;
  tasks: Task[];
};

const WORKSPACE_ROOT = process.cwd();
const TASKS_PATH = process.env.TASKS_JSON_PATH
  ? path.resolve(WORKSPACE_ROOT, process.env.TASKS_JSON_PATH)
  : path.resolve(WORKSPACE_ROOT, "project-context", "tasks.json");

const GOOGLE_SHEET_ID =
  process.env.GOOGLE_SHEET_ID ?? process.env.GOOGLE_DOC_ID;
const GOOGLE_SHEET_NAME = process.env.GOOGLE_SHEET_NAME?.trim() || "Tasks";
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY =
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

function requireEnv(value: string | undefined, key: string): string {
  if (!value || !value.trim()) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

function formatStatus(status: TaskStatus): string {
  if (status === "in_progress") return "In Progress";
  if (status === "todo") return "To Do";
  if (status === "done") return "Done";
  return status;
}

function safeJoin(value: unknown, separator: string = "\n"): string {
  if (Array.isArray(value)) {
    return value.join(separator);
  }
  return value ?? "";
}

function toSheetRows(payload: TasksFile): string[][] {
  const rows: string[][] = [
    ["Updated At", payload.updatedAt ?? "n/a"],
    [],
    [
      "ID",
      "Title",
      "Status",
      "Priority",
      "Scope",
      "Acceptance Criteria",
      "Progress Notes",
    ],
  ];

  for (const task of payload.tasks) {
    rows.push([
      task.id,
      task.title,
      formatStatus(task.status),
      task.priority ?? "",
      safeJoin(task.scope),
      safeJoin(task.acceptanceCriteria),
      safeJoin(task.progressNotes),
    ]);
  }

  return rows;
}

async function loadTasks(): Promise<TasksFile> {
  const raw = await fs.readFile(TASKS_PATH, "utf8");
  const parsed = JSON.parse(raw) as TasksFile;

  if (!Array.isArray(parsed.tasks)) {
    throw new Error("Invalid tasks.json format: tasks must be an array");
  }

  return parsed;
}

async function createSheetsClient() {
  const auth = new google.auth.JWT({
    email: requireEnv(
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    ),
    key: requireEnv(
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
      "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
    ),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  await auth.authorize();

  return google.sheets({ version: "v4", auth });
}

function toSheetRange(sheetName: string, range: string): string {
  const escapedName = sheetName.replace(/'/g, "''");
  return `'${escapedName}'!${range}`;
}

async function ensureSheetExists(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheetName: string,
) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const hasSheet = spreadsheet.data.sheets?.some(
    (sheet) => sheet.properties?.title === sheetName,
  );

  if (hasSheet) {
    return;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: sheetName,
            },
          },
        },
      ],
    },
  });
}

async function syncOnce() {
  const sheetId = requireEnv(GOOGLE_SHEET_ID, "GOOGLE_SHEET_ID");
  const payload = await loadTasks();
  const rows = toSheetRows(payload);
  const sheets = await createSheetsClient();

  await ensureSheetExists(sheets, sheetId, GOOGLE_SHEET_NAME);

  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: toSheetRange(GOOGLE_SHEET_NAME, "A:G"),
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: toSheetRange(GOOGLE_SHEET_NAME, "A1"),
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: rows,
    },
  });

  const now = new Date().toISOString();
  console.log(
    `[${now}] Synced ${TASKS_PATH} to Google Sheet ${sheetId} (${GOOGLE_SHEET_NAME})`,
  );
}

async function runWatch() {
  console.log(`Watching for changes: ${TASKS_PATH}`);

  let timer: ReturnType<typeof setTimeout> | null = null;
  let activeSync: Promise<void> | null = null;

  const triggerSync = () => {
    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      if (!activeSync) {
        activeSync = syncOnce()
          .catch((error) => {
            console.error(
              "Sync failed:",
              error instanceof Error ? error.message : error,
            );
          })
          .finally(() => {
            activeSync = null;
          });
      }
    }, 350);
  };

  await syncOnce();

  const watcher = chokidar.watch(TASKS_PATH, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  });

  watcher.on("change", triggerSync);
  watcher.on("error", (error: unknown) => {
    console.error("Watcher error:", error);
  });

  process.on("SIGINT", async () => {
    await watcher.close();
    process.exit(0);
  });
}

async function main() {
  const mode = process.argv[2] ?? "once";

  if (mode === "watch") {
    await runWatch();
    return;
  }

  await syncOnce();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

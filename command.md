# Finnweb Task Sync Commands

This file is the exact workflow to set up a new PC and keep `project-context/tasks.json` synced to Google Sheets.

## 1) New PC setup (one time)

```powershell
# 1. Clone repo
cd C:\Users\<your-user>\Documents\GitHub
git clone https://github.com/<your-org>/finnweb.git
cd finnweb

# 2. Enable pnpm via Corepack
corepack enable
corepack prepare pnpm@10.17.0 --activate

# 3. Install dependencies
pnpm install

# 4. Create local env file
Copy-Item .env.example .env
```

## 2) Configure Google Sheets sync in .env (one time)

Set these values in `.env`:

```env
GOOGLE_SHEET_ID=<google-sheet-id>
GOOGLE_SHEET_NAME=Tasks
GOOGLE_SERVICE_ACCOUNT_EMAIL=<service-account-email>
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=<private-key-with-\\n>
# Optional (default already works)
TASKS_JSON_PATH=project-context/tasks.json
```

How to get each value:

- `GOOGLE_SHEET_ID`
  - Open your Google Sheet in the browser.
  - Copy the ID from the URL.
  - Example: in `https://docs.google.com/spreadsheets/d/123abcXYZ456/edit`, the Sheet ID is `123abcXYZ456`.
- `GOOGLE_SHEET_NAME`
  - This is the tab name inside the spreadsheet.
  - Default is `Tasks`.
  - If the tab does not exist, the sync script creates it automatically.
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - Go to Google Cloud Console.
  - Create or open a project.
  - Enable Google Sheets API.
  - Create a Service Account.
  - Create a JSON key.
  - Use the `client_email` value from that JSON file.
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
  - Use the `private_key` value from the same JSON key file.
  - Convert real newlines to `\\n` so it stays on one line in `.env`.
  - PowerShell quick conversion:

```powershell
$json = Get-Content .\service-account.json -Raw | ConvertFrom-Json
$json.private_key -replace "`r?`n", "\\n"
```

Important:

- Share the target Google Sheet with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as Editor.
- Keep private key in one line with `\\n` escapes.

## 3) Run sync commands

```powershell
# One-time manual sync
pnpm sync:tasks

# Always-on sync (run this in a dedicated terminal)
pnpm sync:tasks:watch
```

## 4) Daily workflow rule

- Before work: run `pnpm sync:tasks:watch`.
- While working: edit `project-context/tasks.json` normally.
- Result: each save auto-syncs to the Google Sheet.

## 5) Validation and troubleshooting

```powershell
# Check the command works
pnpm sync:tasks
```

Common errors:

- `Missing required env var: GOOGLE_SHEET_ID`
  - Add missing env vars to `.env`.
- `The caller does not have permission`
  - Share the Google Sheet with the service account email.
- Private key errors
  - Ensure `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` uses `\\n` escaped newlines.

## 6) Optional: run watcher in VS Code Task terminal

Open a terminal and keep this running during the session:

```powershell
pnpm sync:tasks:watch
```

## 7) Automation option A: auto-start watcher when VS Code opens this folder

This repo now includes `.vscode/tasks.json` with a folder-open background task:

- Task label: `Sync tasks to Google Sheet (watch)`
- Trigger: opens automatically on folder open (after you allow automatic tasks in VS Code)

Manual run if needed:

```powershell
# VS Code command palette: Tasks: Run Task
# Choose: Sync tasks to Google Sheet (watch)
```

## 8) Automation option B: auto-start watcher on Windows login

Install startup script (one time):

```powershell
pnpm sync:tasks:startup:install
```

This creates a startup command in your Windows Startup folder and runs:

- `pnpm sync:tasks:watch`

Remove startup script:

```powershell
pnpm sync:tasks:startup:uninstall
```

Open watcher in a new PowerShell window manually:

```powershell
pnpm sync:tasks:watch:window
```

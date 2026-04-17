# Workspace Agent Workflow Rules

These rules apply to this repository workflow.

## Mandatory context before suggestions or edits

Always read:

- `project-context/product-brief.md`
- `project-context/decisions.md`
- `project-context/current-focus.md`
- `project-context/memory.md`
- `project-context/brand-book.md`

## Task sync workflow

- `project-context/tasks.json` is the source of truth.
- **Before starting any task**: Update task status to "In Progress" in `project-context/tasks.json`.
- Keep Google Sheet synced using:
  - `pnpm sync:tasks` (one-time)
  - `pnpm sync:tasks:watch` (continuous)
- For active sessions, prefer running watch mode in a dedicated terminal.
- Automation options are both supported:
  - VS Code folder-open task in `.vscode/tasks.json`
  - Windows startup installer script via `pnpm sync:tasks:startup:install`

## After each completed task

Suggest updates to:

- `project-context/changelog.md`
- `project-context/tasks.json`
- `project-context/memory.md` (if new lessons or durable rules were discovered)

## Portability

- Setup and run commands are documented in `command.md`.
- On any new PC, follow `command.md` from top to bottom.

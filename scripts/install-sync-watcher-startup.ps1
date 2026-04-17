$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$startupFolder = [Environment]::GetFolderPath("Startup")
$startupScriptPath = Join-Path $startupFolder "finnweb-sync-tasks-watch.cmd"

$cmdContent = @"
@echo off
cd /d "$repoRoot"
pnpm sync:tasks:watch
"@

Set-Content -Path $startupScriptPath -Value $cmdContent -Encoding ASCII

Write-Output "Installed startup watcher script: $startupScriptPath"
Write-Output "It will run after Windows login and watch project-context/tasks.json."

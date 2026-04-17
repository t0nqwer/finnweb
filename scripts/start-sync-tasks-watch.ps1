$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$command = "Set-Location -LiteralPath '$repoRoot'; pnpm sync:tasks:watch"

Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command", $command
) | Out-Null

Write-Output "Started watcher in a new PowerShell window for: $repoRoot"

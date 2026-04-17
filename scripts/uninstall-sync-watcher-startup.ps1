$ErrorActionPreference = "Stop"

$startupFolder = [Environment]::GetFolderPath("Startup")
$startupScriptPath = Join-Path $startupFolder "finnweb-sync-tasks-watch.cmd"

if (Test-Path -LiteralPath $startupScriptPath) {
  Remove-Item -LiteralPath $startupScriptPath -Force
  Write-Output "Removed startup watcher script: $startupScriptPath"
} else {
  Write-Output "No startup watcher script found at: $startupScriptPath"
}

# CareSync AWS Single-Command Deployment & Release Automation Script (Phase 12H)

[CmdletBinding()]
param (
    [switch]$DryRun,
    [string]$Stage = "full",
    [string]$Env = "demo"
)

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " 🚀 CareSync AWS Deployment & Release Automation (Phase 12H)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$OrchestratorPath = Join-Path $ScriptDir "deploy_orchestrator.py"

$ArgsList = @($OrchestratorPath, "--stage", $Stage, "--env", $Env)
if ($DryRun) {
    $ArgsList += "--dry-run"
}

python @ArgsList

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ CareSync Deployment Pipeline Failed!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ CareSync Deployment Pipeline Passed Cleanly!" -ForegroundColor Green
}

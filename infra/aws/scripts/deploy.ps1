# CareSync AWS Single-Command Deployment & Release Automation Script (Phase 12H.1)

[CmdletBinding()]
param (
    [switch]$Live,
    [string]$Stage = "full",
    [string]$Env = "demo",
    [switch]$ConfirmProduction,
    [switch]$AllowDbDowngrade
)

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " 🚀 CareSync AWS Deployment & Release Automation Engine (Phase 12H.1)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$OrchestratorPath = Join-Path $ScriptDir "deploy_orchestrator.py"

$ArgsList = @($OrchestratorPath, "--stage", $Stage, "--env", $Env)

if ($Live) {
    $ArgsList += "--live"
} else {
    $ArgsList += "--dry-run"
}

if ($ConfirmProduction) {
    $ArgsList += "--confirm-production"
}

if ($AllowDbDowngrade) {
    $ArgsList += "--allow-db-downgrade"
}

python @ArgsList

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ CareSync Deployment Pipeline Failed!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ CareSync Deployment Pipeline Passed Cleanly!" -ForegroundColor Green
}

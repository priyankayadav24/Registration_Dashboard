$ErrorActionPreference = 'Stop'
Set-Location (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'frontend')
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host 'Node.js/npm was not found. Install Node.js 20+ and reopen PowerShell.' -ForegroundColor Red
  exit 1
}
if (-not (Test-Path 'node_modules')) {
  npm install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
npm run dev

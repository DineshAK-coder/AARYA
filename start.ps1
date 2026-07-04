#!/usr/bin/env pwsh
<#
  .SYNOPSIS
    AARYA — Full-Stack Boot Script
    Starts the backend (port 3001) and frontend (port 5173) simultaneously
    in separate terminal windows.

  .USAGE
    From the repo root:
      .\start.ps1

  .NOTES
    - Both servers run in watch/hot-reload mode.
    - Press Ctrl+C in each terminal (or close the windows) to stop.
    - Requires Node.js 18+ and npm installed.
#>

# Paths
$RepoRoot  = $PSScriptRoot
$Backend   = Join-Path $RepoRoot "BACKEND\aarya-backend"
$Frontend  = Join-Path $RepoRoot "FRONTEND"

Write-Host ""
Write-Host "  +----------------------------------------------+" -ForegroundColor Cyan
Write-Host "  |        AARYA - Full-Stack Launcher           |" -ForegroundColor Cyan
Write-Host "  +----------------------------------------------+" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Backend  -> http://localhost:3001" -ForegroundColor Green
Write-Host "  Frontend -> http://localhost:5173" -ForegroundColor Green
Write-Host ""

# Validate directories
foreach ($dir in @($Backend, $Frontend)) {
  if (-not (Test-Path $dir)) {
    Write-Error "Directory not found: $dir"
    exit 1
  }
}

# Launch Backend
Write-Host "  [1/2] Starting Backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "& { Set-Location '$Backend'; Write-Host '[AARYA BACKEND]' -ForegroundColor Green; npm run dev }"
)

# Short delay so the backend starts before the frontend tries to proxy
Start-Sleep -Seconds 2

# Launch Frontend
Write-Host "  [2/2] Starting Frontend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "& { Set-Location '$Frontend'; Write-Host '[AARYA FRONTEND]' -ForegroundColor Magenta; npm run dev }"
)

Write-Host ""
Write-Host "  Both servers are starting in separate terminals." -ForegroundColor Green
Write-Host "  Open http://localhost:5173 in your browser." -ForegroundColor Green
Write-Host ""
Write-Host "  To stop: close the two terminal windows, or press Ctrl+C in each." -ForegroundColor DarkGray
Write-Host ""

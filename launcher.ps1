#Requires -Version 5.1
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   ProfitEngine AI - Automation Launcher"
Write-Host "   DegenTerminal One-Click Control Panel"
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $root

function Show-Menu {
    Write-Host "  [1] Start 24/7 Core System (Dual-Agent Trading + Reply Guy + Binance Square)" -ForegroundColor Green
    Write-Host "  [2] Start Dashboard Server (http://localhost:3000)" -ForegroundColor Yellow
    Write-Host "  [3] Post: Dual Arena Battle Tweet" -ForegroundColor Magenta
    Write-Host "  [4] Post: Binance Writing Update Tweet" -ForegroundColor Magenta
    Write-Host "  [5] Post: Quant Dad Improvement Log Tweet" -ForegroundColor Magenta
    Write-Host "  [6] Post: Debugging Tweaks Tweet" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "  [A] Start All (Core System + Dashboard)" -ForegroundColor Red
    Write-Host "  [0] Exit" -ForegroundColor Gray
    Write-Host ""
}

function Start-All {
    Write-Host "`n>>> Starting 24/7 Core System..." -ForegroundColor Cyan
    $coreProcess = Start-Process -FilePath "node" -ArgumentList "src/scheduler.js" -NoNewWindow -PassThru
    Start-Sleep -Seconds 3

    Write-Host "`n>>> Starting Dashboard Server (port 3000)..." -ForegroundColor Cyan
    Start-Process -FilePath "node" -ArgumentList "server.js" -NoNewWindow -PassThru

    Write-Host "`n[All Started] Core System PID: $($coreProcess.Id)" -ForegroundColor Green
    Write-Host "Dashboard: http://localhost:3000" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop core system`n" -ForegroundColor Gray
    Wait-Process -Id $coreProcess.Id
}

do {
    Show-Menu
    $choice = Read-Host "Select option"
    switch ($choice) {
        "1" {
            Write-Host "`n>>> Starting 24/7 Core System..." -ForegroundColor Cyan
            node src/scheduler.js
            pause
        }
        "2" {
            Write-Host "`n>>> Starting Dashboard Server -> http://localhost:3000" -ForegroundColor Yellow
            node server.js
            pause
        }
        "3" {
            node src/send_dual_arena_tweet.js
            pause
        }
        "4" {
            node src/send_binance_update_tweet.js
            pause
        }
        "5" {
            node src/send_quant_dad_tweet.js
            pause
        }
        "6" {
            node src/send_debugging_tweet.js
            pause
        }
        "a" { Start-All; break }
        "0" { break }
        default { Write-Host "Invalid option, try again" -ForegroundColor Red; pause }
    }
    Write-Host ""
} while ($choice -ne "0" -and $choice -ne "a")

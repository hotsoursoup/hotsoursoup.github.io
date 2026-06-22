$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ManagerUrl = "http://localhost:8000/manage_website/"
$Port = 8000

function Test-PythonCandidate {
    param(
        [string]$Exe,
        [string[]]$Args = @()
    )

    try {
        $output = & $Exe @Args -c "import sys; raise SystemExit(0 if sys.version_info[0] == 3 else 1)" 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Find-Python {
    $candidates = @()

    $py = Get-Command py -ErrorAction SilentlyContinue
    if ($py) {
        $candidates += [pscustomobject]@{ Exe = $py.Source; Args = @("-3"); Label = "Python launcher" }
    }

    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) {
        $candidates += [pscustomobject]@{ Exe = $python.Source; Args = @(); Label = "python" }
    }

    $python3 = Get-Command python3 -ErrorAction SilentlyContinue
    if ($python3) {
        $candidates += [pscustomobject]@{ Exe = $python3.Source; Args = @(); Label = "python3" }
    }

    $knownPaths = @(
        "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
        "$env:ProgramFiles\Python313\python.exe",
        "$env:ProgramFiles\Python312\python.exe",
        "$env:ProgramFiles\Python311\python.exe",
        "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
    )

    foreach ($path in $knownPaths) {
        if (Test-Path $path) {
            $candidates += [pscustomobject]@{ Exe = $path; Args = @(); Label = $path }
        }
    }

    foreach ($candidate in $candidates) {
        if (Test-PythonCandidate -Exe $candidate.Exe -Args $candidate.Args) {
            return $candidate
        }
    }

    return $null
}

function Test-PortOpen {
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    return [bool]$connection
}

Write-Host ""
Write-Host "Hot Sour Soup Manager" -ForegroundColor Cyan
Write-Host "Checking requirements..." -ForegroundColor Gray

if (Test-PortOpen) {
    Write-Host ""
    Write-Host "Port 8000 is already running." -ForegroundColor Yellow
    Write-Host "Opening the manager now:"
    Write-Host $ManagerUrl -ForegroundColor Cyan
    Start-Process $ManagerUrl
    exit 0
}

$python = Find-Python
if (-not $python) {
    Write-Host ""
    Write-Host "Python 3 was not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "Install Python from https://www.python.org/downloads/"
    Write-Host "During install, tick: Add python.exe to PATH"
    Write-Host ""
    Write-Host "No .NET Framework is required."
    Write-Host ""
    Read-Host "Press Enter to close"
    exit 1
}

Write-Host "Using Python: $($python.Label)" -ForegroundColor Green
Write-Host "Starting local server..." -ForegroundColor Gray

$escapedRepo = $RepoRoot.Replace("'", "''")
$escapedPython = $python.Exe.Replace("'", "''")
$pythonArgs = ($python.Args | ForEach-Object { $_.Replace("'", "''") }) -join " "
$serverCommand = "Set-Location -LiteralPath '$escapedRepo'; & '$escapedPython' $pythonArgs -m http.server $Port"

Start-Process powershell.exe -ArgumentList @(
    "-NoProfile",
    "-NoExit",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    $serverCommand
) -WindowStyle Normal

$ready = $false
for ($i = 0; $i -lt 20; $i += 1) {
    Start-Sleep -Milliseconds 500
    try {
        Invoke-WebRequest -Uri $ManagerUrl -UseBasicParsing -TimeoutSec 1 | Out-Null
        $ready = $true
        break
    } catch {
        $ready = $false
    }
}

if ($ready) {
    Write-Host ""
    Write-Host "Ready. Opening manager:" -ForegroundColor Green
    Write-Host $ManagerUrl -ForegroundColor Cyan
    Start-Process $ManagerUrl
    exit 0
}

Write-Host ""
Write-Host "The server did not answer yet." -ForegroundColor Yellow
Write-Host "Look at the new server window for errors."
Write-Host "If it says port 8000 is busy, close the old server window and try again."
Write-Host ""
Read-Host "Press Enter to close"
exit 1

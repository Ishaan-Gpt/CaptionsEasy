// Serves the Windows one-command local-worker installer (PowerShell).
// Mirrors install.sh/route.ts — see its comments for the overall flow.
const REPO_ZIP_URL = "https://codeload.github.com/Ishaan-Gpt/CaptionsEasy/zip/refs/heads/main";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export async function GET(request: Request) {
  const appUrl = new URL(request.url).origin;
  const script = `$ErrorActionPreference = "Stop"

$AppUrl = if ($env:CAPTIONSEASY_APP_URL) { $env:CAPTIONSEASY_APP_URL } else { "${appUrl}" }
$InstallDir = if ($env:CAPTIONSEASY_HOME) { $env:CAPTIONSEASY_HOME } else { "$HOME\\.captionseasy" }

Write-Host ""
Write-Host "======================================================"
Write-Host "  CaptionsEasy - connecting this computer"
Write-Host "======================================================"
Write-Host ""

function Test-Command($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

# Find a real 3.11+ interpreter — checking only "does python exist" isn't
# enough: many Windows machines have an old Python (3.8, 3.9...) shadowing
# python/python3 on PATH, which fails on this codebase's 3.11+ syntax with
# a confusing "'type' object is not subscriptable" error deep in imports
# rather than a clear version message. Prefer the py launcher (lets us pick
# an exact version even when multiple are installed), then fall back to
# checking python3/python's own reported version.
$PythonExe = $null
$PythonArgs = @()
if (Test-Command py) {
    foreach ($v in @("3.13", "3.12", "3.11")) {
        & py "-$v" --version *> $null
        if ($LASTEXITCODE -eq 0) { $PythonExe = "py"; $PythonArgs = @("-$v"); break }
    }
}
if (-not $PythonExe) {
    foreach ($cmd in @("python3.11", "python3", "python")) {
        if (Test-Command $cmd) {
            $verOut = & $cmd --version 2>&1
            if ($verOut -match "Python (\d+)\.(\d+)") {
                $maj = [int]$matches[1]; $min = [int]$matches[2]
                if ($maj -gt 3 -or ($maj -eq 3 -and $min -ge 11)) { $PythonExe = $cmd; $PythonArgs = @(); break }
            }
        }
    }
}
if (-not $PythonExe) {
    Write-Host "!! Python 3.11+ is required, but only an older version (or none) was found on PATH."
    Write-Host "   Install Python 3.11+ from https://python.org (check 'Add to PATH' during setup), then re-run this command."
    exit 1
}
function Invoke-Python { & $PythonExe @PythonArgs @args }

if (-not (Test-Command winget)) {
    Write-Host "!! winget is required to auto-install Node/ffmpeg/cloudflared on this machine."
    Write-Host "   Install App Installer from the Microsoft Store, then re-run this command."
    exit 1
}

if (-not (Test-Command node) -or ((node -v) -replace 'v(\\d+).*', '$1') -lt 20) {
    Write-Host "-> Installing Node.js 20..."
    winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
}

if (-not (Test-Command ffmpeg)) {
    Write-Host "-> Installing ffmpeg..."
    winget install -e --id Gyan.FFmpeg --accept-source-agreements --accept-package-agreements
}

if (-not (Test-Command cloudflared)) {
    Write-Host "-> Installing cloudflared..."
    winget install -e --id Cloudflare.cloudflared --accept-source-agreements --accept-package-agreements
}

if (-not (Test-Command pnpm)) {
    Write-Host "-> Installing pnpm..."
    npm install -g pnpm
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Write-Host "-> Downloading CaptionsEasy worker..."
$ZipPath = Join-Path $InstallDir "source.zip"
Invoke-WebRequest -Uri "${REPO_ZIP_URL}" -OutFile $ZipPath
Expand-Archive -Path $ZipPath -DestinationPath $InstallDir -Force
Remove-Item $ZipPath
$ExtractedDir = Get-ChildItem -Path $InstallDir -Directory | Select-Object -First 1
Get-ChildItem -Path $ExtractedDir.FullName | Move-Item -Destination $InstallDir -Force
Remove-Item $ExtractedDir.FullName -Recurse -Force

Set-Location $InstallDir
Write-Host "-> Installing the Remotion render dependencies (first run only, ~1-2 min)..."
pnpm install --filter remotion-pipeline... --frozen-lockfile

Set-Location "$InstallDir\\apps\\backend"
Write-Host "-> Installing worker dependencies..."
Invoke-Python -m pip install --quiet -r local_worker\\requirements.txt

Write-Host ""
Write-Host "Ready. Connecting..."
Write-Host ""
$env:CAPTIONSEASY_APP_URL = $AppUrl
$env:CAPTIONSEASY_API_URL = "${API_URL}"
$env:PYTHONPATH = "$InstallDir;$InstallDir\\apps\\backend"
Invoke-Python -m local_worker.pair
`;

  return new Response(script, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}

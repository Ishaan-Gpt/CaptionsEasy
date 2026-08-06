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

if (-not (Test-Command python) -and -not (Test-Command python3)) {
    Write-Host "!! Python 3.11+ is required. Install it from https://python.org (check 'Add to PATH'), then re-run this command."
    exit 1
}
$Python = if (Test-Command python) { "python" } else { "python3" }

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
& $Python -m pip install --quiet -r local_worker\\requirements.txt

Write-Host ""
Write-Host "Ready. Connecting..."
Write-Host ""
$env:CAPTIONSEASY_APP_URL = $AppUrl
$env:CAPTIONSEASY_API_URL = "${API_URL}"
$env:PYTHONPATH = "$InstallDir;$InstallDir\\apps\\backend"
& $Python -m local_worker.pair
`;

  return new Response(script, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}

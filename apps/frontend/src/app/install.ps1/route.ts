// Serves the Windows one-command local-worker installer (PowerShell).
//
// Designed for a genuinely fresh machine with nothing pre-installed: it
// never assumes Python/Node/ffmpeg/cloudflared/pnpm already exist, and
// never relies on winget (not guaranteed present on every Windows 10/11
// edition, and can trigger UAC per-package). Every prerequisite it doesn't
// find is fetched as a portable zip/exe into $InstallDir\tools and used
// from there directly — no installers, no admin rights, nothing added to
// the system PATH permanently.
const REPO_ZIP_URL = "https://codeload.github.com/Ishaan-Gpt/CaptionsEasy/zip/refs/heads/main";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const PYTHON_EMBED_URL = "https://www.python.org/ftp/python/3.11.9/python-3.11.9-embed-amd64.zip";
const GET_PIP_URL = "https://bootstrap.pypa.io/get-pip.py";
const NODE_ZIP_URL = "https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip";
// BtbN's GitHub-hosted build rather than gyan.dev's own server — measured
// gyan.dev stalling for minutes on this connection during testing; GitHub's
// release CDN was consistently fast. Includes ffprobe.exe alongside
// ffmpeg.exe in the same bin/ folder, which is all this script needs.
const FFMPEG_ZIP_URL = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip";

export async function GET(request: Request) {
  const appUrl = new URL(request.url).origin;
  const script = `# CaptionsEasy local worker installer (Windows) — safe to run on a brand
# new machine with nothing installed. Run in a normal (non-administrator)
# PowerShell window: irm ${appUrl}/install.ps1 | iex
$ErrorActionPreference = "Stop"
# Invoke-WebRequest's default progress-bar rendering makes large downloads
# dramatically slower in Windows PowerShell (measured firsthand: a ~100MB
# file effectively stalling for minutes) — every download below is large
# enough for this to matter.
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$AppUrl = if ($env:CAPTIONSEASY_APP_URL) { $env:CAPTIONSEASY_APP_URL } else { "${appUrl}" }
$InstallDir = if ($env:CAPTIONSEASY_HOME) { $env:CAPTIONSEASY_HOME } else { "$HOME\\.captionseasy" }
$ToolsDir = Join-Path $InstallDir "tools"
New-Item -ItemType Directory -Force -Path $ToolsDir | Out-Null

Write-Host ""
Write-Host "======================================================"
Write-Host "  CaptionsEasy - connecting this computer"
Write-Host "  (first run on a new machine takes a few minutes)"
Write-Host "======================================================"
Write-Host ""

function Test-Command($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Get-VersionOk($cmd, $minMajor, $minMinor) {
    try {
        $out = & $cmd --version 2>&1
        if ($out -match "(\\d+)\\.(\\d+)") {
            $maj = [int]$matches[1]; $min = [int]$matches[2]
            return ($maj -gt $minMajor -or ($maj -eq $minMajor -and $min -ge $minMinor))
        }
    } catch {}
    return $false
}

function Get-Zip($url, $destDir, $label) {
    Write-Host "-> Downloading $label ..."
    $zipPath = Join-Path $ToolsDir ((New-Guid).Guid + ".zip")
    Invoke-WebRequest -Uri $url -OutFile $zipPath
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    Expand-Archive -Path $zipPath -DestinationPath $destDir -Force
    Remove-Item $zipPath
}

# ---------------------------------------------------------------------
# Python 3.11+ — prefer whatever's already on the machine (via the py
# launcher, so we pick an exact version even when an older Python also
# shadows python/python3), otherwise fetch the official portable
# "embeddable" build and bootstrap pip into it ourselves.
# ---------------------------------------------------------------------
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
        if ((Test-Command $cmd) -and (Get-VersionOk $cmd 3 11)) { $PythonExe = $cmd; $PythonArgs = @(); break }
    }
}
if (-not $PythonExe) {
    $PyDir = Join-Path $ToolsDir "python"
    if (-not (Test-Path (Join-Path $PyDir "python.exe"))) {
        Get-Zip "${PYTHON_EMBED_URL}" $PyDir "Python 3.11 (portable, no install needed)"
        # The embeddable build ships with site-packages disabled by
        # default (a commented-out "import site" in its ._pth file) —
        # without re-enabling it, pip and every installed package would
        # be invisible to the interpreter.
        $pthFile = Get-ChildItem $PyDir -Filter "*._pth" | Select-Object -First 1
        (Get-Content $pthFile.FullName) -replace "^#import site$", "import site" | Set-Content $pthFile.FullName
        Write-Host "-> Bootstrapping pip..."
        $getPip = Join-Path $PyDir "get-pip.py"
        Invoke-WebRequest -Uri "${GET_PIP_URL}" -OutFile $getPip
        & "$PyDir\\python.exe" $getPip --no-warn-script-location --quiet
    }
    $PythonExe = "$PyDir\\python.exe"
    $PythonArgs = @()
}
function Invoke-Python { & $PythonExe @PythonArgs @args }

# ---------------------------------------------------------------------
# Node.js 20+ (for the Remotion render step) — same idea: use it if it's
# already there and current enough, otherwise fetch the portable zip.
# ---------------------------------------------------------------------
$NodeBin = $null
if ((Test-Command node) -and (Get-VersionOk node 20 0)) {
    $NodeBin = Split-Path -Parent (Get-Command node).Source
} else {
    $NodeDir = Join-Path $ToolsDir "node"
    $nodeExe = Get-ChildItem $NodeDir -Filter "node.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $nodeExe) {
        Get-Zip "${NODE_ZIP_URL}" $NodeDir "Node.js 20 (portable, no install needed)"
        $nodeExe = Get-ChildItem $NodeDir -Filter "node.exe" -Recurse | Select-Object -First 1
    }
    $NodeBin = $nodeExe.DirectoryName
}
$env:Path = "$NodeBin;$env:Path"

# --- ffmpeg ---
if (-not (Test-Command ffmpeg)) {
    $FfmpegDir = Join-Path $ToolsDir "ffmpeg"
    $ffmpegExe = Get-ChildItem $FfmpegDir -Filter "ffmpeg.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $ffmpegExe) {
        Get-Zip "${FFMPEG_ZIP_URL}" $FfmpegDir "ffmpeg (portable, no install needed)"
        $ffmpegExe = Get-ChildItem $FfmpegDir -Filter "ffmpeg.exe" -Recurse | Select-Object -First 1
    }
    $env:Path = "$($ffmpegExe.DirectoryName);$env:Path"
}
# cloudflared is fetched automatically by local_worker/pair.py itself if
# it isn't already on PATH, so nothing to do for it here.

# ---------------------------------------------------------------------
# Download the worker source (no git required) and install dependencies.
# This is under active development — "already downloaded" alone isn't
# enough to skip, or a stale local copy would silently miss bug fixes
# forever. Compare against the latest commit on GitHub (one small API
# call, not a re-download) and only re-fetch when it's actually changed.
# ---------------------------------------------------------------------
$ShaMarkerFile = Join-Path $InstallDir ".captionseasy_commit_sha"
$RemoteSha = $null
try {
    $RemoteSha = (Invoke-RestMethod -Uri "https://api.github.com/repos/Ishaan-Gpt/CaptionsEasy/commits/main" -Headers @{ "User-Agent" = "captionseasy-installer" }).sha
} catch {
    Write-Host "   (couldn't check for updates — continuing with what's local, if any)"
}
$LocalSha = if (Test-Path $ShaMarkerFile) { (Get-Content $ShaMarkerFile -Raw).Trim() } else { $null }
$NeedsDownload = (-not (Test-Path (Join-Path $InstallDir "apps\\backend"))) -or ($RemoteSha -and $RemoteSha -ne $LocalSha)

if ($NeedsDownload) {
    Write-Host "-> Downloading CaptionsEasy worker..."
    $ZipPath = Join-Path $InstallDir "source.zip"
    Invoke-WebRequest -Uri "${REPO_ZIP_URL}" -OutFile $ZipPath
    # Clear any previous extracted copy (but keep tools/ and the hash
    # markers) so files removed upstream don't linger as stale leftovers.
    Get-ChildItem -Path $InstallDir -Exclude "tools", ".captionseasy_*", "source.zip" |
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Expand-Archive -Path $ZipPath -DestinationPath $InstallDir -Force
    Remove-Item $ZipPath
    $ExtractedDir = Get-ChildItem -Path $InstallDir -Directory | Where-Object { $_.Name -like "CaptionsEasy-*" } | Select-Object -First 1
    Get-ChildItem -Path $ExtractedDir.FullName | Move-Item -Destination $InstallDir -Force
    Remove-Item $ExtractedDir.FullName -Recurse -Force
    if ($RemoteSha) { Set-Content $ShaMarkerFile $RemoteSha }
} else {
    Write-Host "-> CaptionsEasy worker already up to date, skipping."
}

Set-Location $InstallDir
# Skip work already done: hash the lockfile/requirements and compare
# against what we installed last time, so a repeat run by the same user
# (or a dev machine that already has everything) is instant instead of
# re-running pnpm/pip on every reconnect.
$LockHashFile = Join-Path $InstallDir ".captionseasy_pnpm_lock_hash"
$CurrentLockHash = (Get-FileHash "pnpm-lock.yaml" -Algorithm SHA256).Hash
if (-not (Test-Path $LockHashFile) -or (Get-Content $LockHashFile -Raw).Trim() -ne $CurrentLockHash) {
    Write-Host "-> Installing the Remotion render dependencies (first run only, ~1-2 min)..."
    # npx (bundled with Node) fetches pnpm on demand — pinned to an exact
    # version so npx uses its local cache instantly on repeat runs instead
    # of hitting the registry to resolve a floating tag. No separate pnpm
    # install/shim step, nothing touches the system PATH.
    & "$NodeBin\\npx.cmd" --yes pnpm@10.34.5 install --filter remotion-pipeline... --frozen-lockfile
    Set-Content $LockHashFile $CurrentLockHash
} else {
    Write-Host "-> Remotion dependencies already up to date, skipping."
}

Set-Location "$InstallDir\\apps\\backend"
$ReqHashFile = Join-Path $InstallDir ".captionseasy_requirements_hash"
$CurrentReqHash = (Get-FileHash "local_worker\\requirements.txt" -Algorithm SHA256).Hash
if (-not (Test-Path $ReqHashFile) -or (Get-Content $ReqHashFile -Raw).Trim() -ne $CurrentReqHash) {
    Write-Host "-> Installing worker dependencies..."
    Invoke-Python -m pip install --quiet -r local_worker\\requirements.txt
    Set-Content $ReqHashFile $CurrentReqHash
} else {
    Write-Host "-> Worker dependencies already up to date, skipping."
}

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

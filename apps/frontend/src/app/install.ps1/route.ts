// Windows one-command installer for the CapsEasy Companion:  irm <app>/install.ps1 | iex
// Needs no admin rights. Uses an existing Node >= 20, else a portable Node in %LOCALAPPDATA%.
// Contains NO secrets: the companion authenticates with its own paired token.

const NODE_VERSION = "20.18.0";

export async function GET(request: Request) {
  const app = (process.env.APP_URL ?? new URL(request.url).origin).replace(/\/$/, "");
  const script = `# CapsEasy Companion installer (Windows). Run in a normal PowerShell window:
#   irm ${app}/install.ps1 | iex
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$App = "${app}"
$Home2 = Join-Path $env:LOCALAPPDATA "capseasy"
New-Item -ItemType Directory -Force -Path $Home2 | Out-Null

function Get-NodeMajor {
  try { $v = (& node --version) 2>$null; if ($v -match "^v(\\d+)") { return [int]$Matches[1] } } catch {}
  return 0
}

Write-Host ""
Write-Host "  CapsEasy Companion" -ForegroundColor Green
Write-Host "  Makes captions privately on this computer." -ForegroundColor DarkGray
Write-Host ""

if ((Get-NodeMajor) -lt 20) {
  Write-Host "> Node.js 20+ not found, installing a private copy (no admin needed)..."
  $NodeDir = Join-Path $Home2 "node"
  $Zip = Join-Path $env:TEMP "capseasy-node.zip"
  Invoke-WebRequest "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip" -OutFile $Zip
  if (Test-Path $NodeDir) { Remove-Item -Recurse -Force $NodeDir }
  Expand-Archive -Force $Zip $Home2
  Move-Item (Join-Path $Home2 "node-v${NODE_VERSION}-win-x64") $NodeDir
  Remove-Item $Zip
  $env:Path = "$NodeDir;$env:Path"
  $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if ($UserPath -notlike "*$NodeDir*") { [Environment]::SetEnvironmentVariable("Path", "$NodeDir;$UserPath", "User") }
}

# global npm bin must be on PATH for the 'capseasy' command
$NpmPrefix = (& npm prefix -g).Trim()
if ($env:Path -notlike "*$NpmPrefix*") { $env:Path = "$NpmPrefix;$env:Path" }

Write-Host "> Installing the Companion..."
& npm install -g --no-fund --no-audit "$App/companion/capseasy-companion-latest.tgz"
if ($LASTEXITCODE -ne 0) { throw "npm install failed (exit $LASTEXITCODE)" }

Write-Host "> Pairing with your account (a browser window will open)..."
& capseasy login --api $App
if ($LASTEXITCODE -ne 0) { throw "Pairing did not finish. Run: capseasy login --api $App" }

Write-Host ""
Write-Host "  All set. Keep this running while you make captions:" -ForegroundColor Green
Write-Host "    capseasy start" -ForegroundColor Cyan
Write-Host "  (The first job downloads the speech model and renderer once, a few hundred MB.)" -ForegroundColor DarkGray
Write-Host ""
& capseasy start
`;
  return new Response(script, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

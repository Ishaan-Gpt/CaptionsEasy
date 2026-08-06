// Serves the macOS/Linux one-command local-worker installer. The user
// never runs `git clone` themselves — this script does the equivalent
// invisibly via a GitHub tarball download. See local-worker processing
// in DEPLOYMENT.md for the full architecture this sets up.
const REPO_TARBALL_URL = "https://codeload.github.com/Ishaan-Gpt/CaptionsEasy/tar.gz/refs/heads/main";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export async function GET(request: Request) {
  const appUrl = new URL(request.url).origin;
  const script = `#!/usr/bin/env bash
set -euo pipefail

APP_URL="\${CAPTIONSEASY_APP_URL:-${appUrl}}"
INSTALL_DIR="\${CAPTIONSEASY_HOME:-$HOME/.captionseasy}"

echo ""
echo "======================================================"
echo "  CaptionsEasy - connecting this computer"
echo "======================================================"
echo ""

# --- Homebrew (macOS) ---
if [[ "$(uname -s)" == "Darwin" ]] && ! command -v brew >/dev/null 2>&1; then
  echo "-> Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# --- Python 3.11+ ---
if ! command -v python3 >/dev/null 2>&1; then
  echo "!! Python 3.11+ is required. Install it from https://python.org, then re-run this command."
  exit 1
fi

# --- Node.js 20+ (for the Remotion render step) ---
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 20 ]]; then
  echo "-> Installing Node.js 20..."
  if command -v brew >/dev/null 2>&1; then brew install node@20 && brew link --overwrite --force node@20
  elif command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs
  else echo "!! Install Node 20+ from https://nodejs.org, then re-run." && exit 1; fi
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "-> Installing pnpm..."
  npm install -g pnpm
fi

# --- ffmpeg ---
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "-> Installing ffmpeg..."
  if command -v brew >/dev/null 2>&1; then brew install ffmpeg
  elif command -v apt-get >/dev/null 2>&1; then sudo apt-get update && sudo apt-get install -y ffmpeg
  else echo "!! Install ffmpeg: https://ffmpeg.org/download.html" && exit 1; fi
fi

# --- cloudflared ---
if ! command -v cloudflared >/dev/null 2>&1; then
  echo "-> Installing cloudflared..."
  if command -v brew >/dev/null 2>&1; then brew install cloudflare/cloudflare/cloudflared
  elif command -v apt-get >/dev/null 2>&1; then
    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
    echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared \$(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
    sudo apt-get update && sudo apt-get install -y cloudflared
  else echo "!! Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads" && exit 1; fi
fi

# --- Download the worker source (no git required) ---
mkdir -p "$INSTALL_DIR"
echo "-> Downloading CaptionsEasy worker..."
curl -fsSL "${REPO_TARBALL_URL}" | tar -xz --strip-components=1 -C "$INSTALL_DIR"

cd "$INSTALL_DIR"
echo "-> Installing the Remotion render dependencies (first run only, ~1-2 min)..."
pnpm install --filter remotion-pipeline... --frozen-lockfile

cd "$INSTALL_DIR/apps/backend"
echo "-> Installing worker dependencies..."
python3 -m pip install --quiet -r local_worker/requirements.txt

echo ""
echo "Ready. Connecting..."
echo ""
CAPTIONSEASY_APP_URL="$APP_URL" CAPTIONSEASY_API_URL="${API_URL}" PYTHONPATH="$INSTALL_DIR:$INSTALL_DIR/apps/backend" python3 -m local_worker.pair
`;

  return new Response(script, {
    headers: {
      "Content-Type": "text/x-shellscript; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}

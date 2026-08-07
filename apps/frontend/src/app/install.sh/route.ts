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

# --- Python 3.11+ (checking existence isn't enough — an old python3 on
# PATH fails deep inside this codebase's imports with a confusing
# "'type' object is not subscriptable" error rather than a clear version
# message, so check the actual reported version) ---
PYTHON=""
for cmd in python3.13 python3.12 python3.11 python3 python; do
  if command -v "$cmd" >/dev/null 2>&1; then
    ver="$("$cmd" -c 'import sys; print("%d.%d" % sys.version_info[:2])' 2>/dev/null || echo 0.0)"
    major="\${ver%%.*}"; minor="\${ver##*.}"
    if [ "$major" -gt 3 ] || { [ "$major" -eq 3 ] && [ "$minor" -ge 11 ]; }; then
      PYTHON="$cmd"
      break
    fi
  fi
done
if [ -z "$PYTHON" ]; then
  echo "!! Python 3.11+ is required, but only an older version (or none) was found on PATH."
  echo "   Install Python 3.11+ from https://python.org, then re-run this command."
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

# --- Download the worker source (no git required). This is under active
# development — "already downloaded" alone isn't enough to skip, or a
# stale local copy would silently miss bug fixes forever. Compare against
# the latest commit on GitHub (one small API call, not a re-download) and
# only re-fetch when it's actually changed. ---
mkdir -p "$INSTALL_DIR"
SHA_MARKER_FILE="$INSTALL_DIR/.captionseasy_commit_sha"
REMOTE_SHA="$(curl -fsSL -H "User-Agent: captionseasy-installer" https://api.github.com/repos/Ishaan-Gpt/CaptionsEasy/commits/main 2>/dev/null | grep -o '"sha": *"[a-f0-9]*"' | head -1 | grep -oE '[a-f0-9]{40}' || true)"
LOCAL_SHA="$([ -f "$SHA_MARKER_FILE" ] && cat "$SHA_MARKER_FILE" || true)"

if [ ! -d "$INSTALL_DIR/apps/backend" ] || { [ -n "$REMOTE_SHA" ] && [ "$REMOTE_SHA" != "$LOCAL_SHA" ]; }; then
  echo "-> Downloading CaptionsEasy worker..."
  # Clear any previous extracted copy (but keep tools/ and hash markers)
  # so files removed upstream don't linger as stale leftovers.
  find "$INSTALL_DIR" -mindepth 1 -maxdepth 1 ! -name "tools" ! -name ".captionseasy_*" -exec rm -rf {} +
  curl -fsSL "${REPO_TARBALL_URL}" | tar -xz --strip-components=1 -C "$INSTALL_DIR"
  [ -n "$REMOTE_SHA" ] && echo "$REMOTE_SHA" > "$SHA_MARKER_FILE"
else
  echo "-> CaptionsEasy worker already up to date, skipping."
fi

# macOS ships shasum, not sha256sum; Linux is the reverse — support both.
hash_file() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | awk '{print $1}'
  else shasum -a 256 "$1" | awk '{print $1}'
  fi
}

cd "$INSTALL_DIR"
LOCK_HASH_FILE="$INSTALL_DIR/.captionseasy_pnpm_lock_hash"
CURRENT_LOCK_HASH="$(hash_file pnpm-lock.yaml)"
if [ ! -f "$LOCK_HASH_FILE" ] || [ "$(cat "$LOCK_HASH_FILE")" != "$CURRENT_LOCK_HASH" ]; then
  echo "-> Installing the Remotion render dependencies (first run only, ~1-2 min)..."
  pnpm install --filter remotion-pipeline... --frozen-lockfile
  echo "$CURRENT_LOCK_HASH" > "$LOCK_HASH_FILE"
else
  echo "-> Remotion dependencies already up to date, skipping."
fi

cd "$INSTALL_DIR/apps/backend"
REQ_HASH_FILE="$INSTALL_DIR/.captionseasy_requirements_hash"
CURRENT_REQ_HASH="$(hash_file local_worker/requirements.txt)"
if [ ! -f "$REQ_HASH_FILE" ] || [ "$(cat "$REQ_HASH_FILE")" != "$CURRENT_REQ_HASH" ]; then
  echo "-> Installing worker dependencies..."
  "$PYTHON" -m pip install --quiet -r local_worker/requirements.txt
  echo "$CURRENT_REQ_HASH" > "$REQ_HASH_FILE"
else
  echo "-> Worker dependencies already up to date, skipping."
fi

echo ""
echo "Ready. Connecting..."
echo ""
CAPTIONSEASY_APP_URL="$APP_URL" CAPTIONSEASY_API_URL="${API_URL}" PYTHONPATH="$INSTALL_DIR:$INSTALL_DIR/apps/backend" "$PYTHON" -m local_worker.pair
`;

  return new Response(script, {
    headers: {
      "Content-Type": "text/x-shellscript; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}

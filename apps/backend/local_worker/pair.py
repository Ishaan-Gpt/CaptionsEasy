#!/usr/bin/env python
"""Runs the local worker + a Cloudflare Quick Tunnel and pairs it with the
CaptionsEasy web app, so the user never sees ports/tokens/URLs. Python port
of smoothrecord's worker/src/pair.js — same flow:

1. Generate a strong random bearer token.
2. Spawn the worker HTTP server (server.py) on 127.0.0.1:<random port>.
3. Spawn `cloudflared tunnel --url http://127.0.0.1:<port>` and capture the
   printed https://*.trycloudflare.com URL.
4. POST /api/v1/pair/start with that URL and the token; get a pairing code
   + confirm URL back.
5. Print the confirm URL big and clear; poll until the user confirms.
6. Keep both processes running until Ctrl-C.
"""

import os
import re
import secrets
import shutil
import socket
import stat
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

import httpx

from local_worker.settings import get_local_worker_settings

WORKER_DIR = Path(__file__).resolve().parent


def _pick_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def _find_or_download_cloudflared() -> str:
    existing = shutil.which("cloudflared")
    if existing:
        return existing

    local_bin = WORKER_DIR / ("cloudflared.exe" if os.name == "nt" else "cloudflared")
    if local_bin.exists():
        return str(local_bin)

    if os.name == "nt":
        asset = "cloudflared-windows-amd64.exe"
    elif sys.platform == "darwin":
        asset = "cloudflared-darwin-arm64.tgz" if "arm" in os.uname().machine.lower() else "cloudflared-darwin-amd64.tgz"
    else:
        asset = "cloudflared-linux-arm64" if "arm" in os.uname().machine.lower() else "cloudflared-linux-amd64"

    url = f"https://github.com/cloudflare/cloudflared/releases/latest/download/{asset}"
    print(f"[captionseasy] Downloading cloudflared from {url} ...")
    urllib.request.urlretrieve(url, str(local_bin))
    if os.name != "nt":
        local_bin.chmod(local_bin.stat().st_mode | stat.S_IEXEC)
    return str(local_bin)


def main() -> None:
    # Windows consoles default stdout to the system codepage (cp1252),
    # which can't encode arbitrary characters — reconfigure defensively
    # rather than relying on every future print() staying pure-ASCII.
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    settings = get_local_worker_settings()
    worker_token = secrets.token_hex(24)
    port = settings.port or _pick_free_port()

    print(f"[captionseasy] Starting worker on 127.0.0.1:{port} ...")
    env = {**os.environ, "PORT": str(port), "WORKER_TOKEN": worker_token, "PYTHONUNBUFFERED": "1"}
    worker_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "local_worker.server:app", "--host", "127.0.0.1", "--port", str(port)],
        cwd=str(WORKER_DIR.parent),
        env=env,
    )

    try:
        for _ in range(60):
            try:
                with httpx.Client(timeout=1.0) as c:
                    if c.get(f"http://127.0.0.1:{port}/healthz").status_code == 200:
                        break
            except Exception:
                pass
            time.sleep(0.5)
        else:
            raise RuntimeError("worker did not come up in 30s")
        print("[captionseasy] Worker is up.")

        cloudflared_bin = _find_or_download_cloudflared()
        print("[captionseasy] Starting Cloudflare tunnel ...")
        cf_proc = subprocess.Popen(
            [cloudflared_bin, "tunnel", "--url", f"http://127.0.0.1:{port}", "--no-autoupdate"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )

        tunnel_url = None
        deadline = time.monotonic() + 45
        while time.monotonic() < deadline:
            line = cf_proc.stdout.readline()
            if not line:
                if cf_proc.poll() is not None:
                    raise RuntimeError(f"cloudflared exited with code {cf_proc.returncode}")
                continue
            match = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", line)
            if match:
                tunnel_url = match.group(0)
                break
        if tunnel_url is None:
            raise RuntimeError("cloudflared did not print a URL in 45s")
        print(f"[captionseasy] Tunnel ready: {tunnel_url}")

        api_url = settings.backend_api_url.rstrip("/")
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                f"{api_url}/pair/start",
                json={"worker_name": settings.worker_name, "worker_token": worker_token, "worker_url": tunnel_url},
            )
            resp.raise_for_status()
            pairing = resp.json()["data"]

            print("")
            print("=" * 56)
            print("  Almost done. Open this link and click Confirm:")
            print("")
            print(f"    {pairing['confirmUrl']}")
            print("")
            print(f"  Pairing code: {pairing['code']}   (expires in 15 min)")
            print("=" * 56)
            print("")

            deadline = time.monotonic() + 15 * 60
            confirmed = False
            while time.monotonic() < deadline:
                time.sleep(2.5)
                try:
                    poll_resp = client.get(pairing["pollUrl"])
                    poll_resp.raise_for_status()
                    status = poll_resp.json()["data"]["status"]
                except Exception as exc:
                    print(f"[captionseasy] poll error: {exc}")
                    continue
                if status == "confirmed":
                    confirmed = True
                    break
                if status in ("denied", "expired"):
                    print(f"[captionseasy] Pairing {status}. Exiting.")
                    sys.exit(1)

            if not confirmed:
                print("[captionseasy] Pairing timed out.")
                sys.exit(1)

        print("Paired. Your computer is now online in CaptionsEasy.")
        print("Leave this terminal open. Ctrl-C to stop.")
        cf_proc.wait()
    except KeyboardInterrupt:
        pass
    finally:
        worker_proc.terminate()
        try:
            cf_proc.terminate()
        except NameError:
            pass


if __name__ == "__main__":
    main()

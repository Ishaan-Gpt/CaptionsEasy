"""The local worker's own tiny HTTP server. Reached by the backend through
a Cloudflare Quick Tunnel — see pair.py. Mirrors smoothrecord's worker/src
/server.js: accept a job, return 202 immediately, do the work in the
background, report results via callbacks (run_job.py) rather than a
response the caller waits on.
"""

import asyncio
import logging
import os

from fastapi import FastAPI, HTTPException, Request

from local_worker.run_job import run_job

logger = logging.getLogger("captionseasy.local_worker")

WORKER_TOKEN = os.environ.get("WORKER_TOKEN", "")

app = FastAPI(title="CaptionsEasy Local Worker")


@app.get("/healthz")
async def healthz():
    return {"ok": True}


@app.post("/jobs", status_code=202)
async def receive_job(payload: dict, request: Request):
    auth = request.headers.get("authorization", "")
    if not WORKER_TOKEN or auth != f"Bearer {WORKER_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    asyncio.create_task(run_job(payload, WORKER_TOKEN))
    return {"status": "accepted", "jobId": payload.get("jobId")}

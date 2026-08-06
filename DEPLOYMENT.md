# Sprint 1.6 — Deployment Runbook

This sprint is shipping, not coding. Items marked **[YOU]** require your
accounts/credentials/dashboard access — I cannot do these for you. Items
marked **[DONE]** are already prepared in this repo.

## Local-worker processing (current state, read this first)

Render's free-tier web service (512MB RAM) OOM'd mid-render during a live
smoke test — Chromium (Remotion) + ffmpeg + FastAPI + the inline Celery
worker all sharing one process exceeded it. Rather than upgrade the Render
plan, **AI-pipeline and render jobs now run on the user's own computer**
instead of Celery, pushed over a Cloudflare Quick Tunnel and reported back
over HTTPS. This was verified end-to-end against the live deployment
(pairing → dispatch → Groq transcription/creative/caption → Remotion
render → export persisted to Supabase Storage).

- **Render still runs the CRUD API** — auth, projects, uploads, jobs,
  metadata extraction, storage cleanup are all unchanged and still Celery/
  inline-worker-backed. Only `ai_pipeline`/`render` job types are rerouted;
  see `app/worker/dispatcher.py`'s `CompositeJobDispatcher`.
- **Cloud AI/render processing is dormant, not deleted** — `app.worker.
  ai_pipeline_stage`/`render_stage`/`tasks.py` are untouched and would
  work again immediately if a project ever wants to re-enable cloud
  processing (e.g. after upgrading the Render plan) by pointing the
  dispatcher back at Celery for those job types.
- **New required env vars on Render** (already set): `BACKEND_PUBLIC_URL`
  (this backend's own public URL, e.g. `https://motionai-backend.onrender.com/api/v1`
  — handed to paired workers so they know where to call back) and
  `FRONTEND_URL` (e.g. `https://captionseasy.vercel.app` — used to build
  the `/pair` confirmation link).
- **The local worker** lives at `apps/backend/local_worker/` — a small
  FastAPI service that reuses `app.ai.orchestration`/`app.render.engine`
  unmodified (both are pure-compute, no DB/Celery coupling) so the exact
  same tested pipeline code runs on a user's machine. It never holds
  Supabase or database credentials — only a Groq API key and a per-worker
  bearer token generated at pairing time.
- **Users connect a computer** via one command from Settings:
  `curl -fsSL https://captionseasy.vercel.app/install.sh | bash` (mac/
  Linux) or `irm https://captionseasy.vercel.app/install.ps1 | iex`
  (Windows) — served by `apps/frontend/src/app/install.sh|install.ps1`.
  No git clone; the script downloads a GitHub tarball invisibly. The
  script installs Node 20+/pnpm/ffmpeg/cloudflared if missing, starts the
  worker, opens a Cloudflare Quick Tunnel, and prints a `/pair?code=...`
  link the user opens and confirms while logged in.
- **If a job is dispatched with no paired/online worker**, the backend
  fails it immediately with `NO_WORKER_PAIRED` (409) rather than leaving
  it stuck at "queued" — the frontend shows a "Connect your computer" CTA
  linking to Settings (see `ExportHistorySection.tsx`'s `isNoWorkerError`).
- Cloud processing is shown as **"coming soon"** on the Settings page —
  this is the only processing path right now, not a fallback option.

## Pre-Deploy Checklist

Run through this before touching Render/Vercel — catches the local,
fixable issues before they become live-deployment debugging.

- [ ] Alembic migrations are clean (`alembic upgrade head` runs without error against a fresh DB)
- [ ] All backend tests pass (`pytest` — see Sprint 1.4/1.5 test suites)
- [ ] Frontend builds successfully (`pnpm --filter frontend build`)
- [ ] Docker image builds locally (`docker build -f apps/backend/Dockerfile -t motionai-backend .`)
- [ ] FFmpeg available in the container (`docker run --rm motionai-backend ffmpeg -version`)
- [ ] Groq API key verified (a real transcription call against it succeeds, not just that the key is set)
- [ ] Supabase database reachable (`psql` or `alembic` against `DATABASE_URL` succeeds)
- [ ] Supabase Storage bucket created (and private — see section 0 below)
- [ ] Redis reachable (`redis-cli -u $REDIS_URL ping`)
- [ ] Worker starts successfully (`celery -A app.worker.celery_app worker --loglevel=info` reaches "ready" with no import errors)
- [ ] Backend health endpoint returns 200 (`GET /health` and `/health/ready` locally)
- [ ] Frontend can reach backend (`NEXT_PUBLIC_API_URL` set, a request succeeds against the local/staged backend)
- [ ] Upload succeeds end-to-end locally
- [ ] Transcript generated (real Groq call, not the dummy provider)
- [ ] Transcript stored in database (row exists in `transcripts` table)
- [ ] Logs contain no unhandled exceptions during the above

## 0. Prerequisites — accounts

- **[YOU]** Groq account + API key (https://console.groq.com). You said
  Supabase is already set up but Groq still needs an account/key.
- **[YOU]** Render account (https://render.com) — backend, runs the worker inline (free tier has no separate Background Worker type).
- **[YOU]** Upstash account (https://upstash.com) — free Redis instance for Celery. Free tier (10k commands/day) comfortably covers a handful of occasional beta users. Create a database, region closest to Render's (Oregon by default), copy the `rediss://` connection string.
- **[YOU]** Vercel account (https://vercel.com) — frontend.
- **[DONE]** Supabase: confirm you have, from your existing project's
  Settings > API / Database pages:
  - Project URL (`SUPABASE_URL`)
  - Service role key (`SUPABASE_SERVICE_ROLE_KEY`)
  - Anon/public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`, for the frontend)
  - JWT secret (`SUPABASE_JWT_SECRET`, Settings > API > JWT Settings)
  - Async DB connection string (`DATABASE_URL_ASYNC`, use the `postgresql+asyncpg://...` form of your connection string)
  - Sync DB connection string (`DATABASE_URL`, `postgresql+psycopg2://...` form, used only by Alembic)
  - Storage bucket name (`SUPABASE_STORAGE_BUCKET`) — create one (e.g. `videos`) under Storage if it doesn't exist yet, and make sure it is **not** public (Storage clients use the service role key, never a public URL).

## 1. Backend + inline worker — Render

**[DONE]** `apps/backend/Dockerfile` and `render.yaml` (repo root) define a
single service, `motionai-backend` — web service running `uvicorn`, health
check at `/health`. There is no separate worker service: Render's free tier
has no Background Worker type, so `RUN_WORKER_INLINE=true` makes this same
process also run the Celery worker loop in a background thread (see
`app.main._start_inline_worker`). It talks to an **external** Redis
(Upstash) rather than a Render-managed one. The Dockerfile also installs
Node.js + pnpm and the `apps/remotion-pipeline` workspace, since
`app/render/engine.py`'s default render path shells out to
`npx remotion render` — this was missing until this deploy and would have
failed every real render job.

**[YOU]** in the Render dashboard:
1. New > Blueprint, point at this repo/branch — Render reads `render.yaml` and creates the service.
2. Set these env vars manually (Render does not let a blueprint commit secrets):
   - `DATABASE_URL_ASYNC`, `DATABASE_URL`, `SUPABASE_JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`
   - `REDIS_URL` — the `rediss://...` string from Upstash (note the double `s`, TLS)
   - `GROQ_API_KEY` (and leave `GROQ_BASE_URL`/`GROQ_SPEECH_MODEL` at their defaults unless you need to override)
   - `SPEECH_PROVIDER_NAME=groq`, `CREATIVE_PROVIDER_NAME=groq`, `CAPTION_PROVIDER_NAME=groq` (all default to `dummy` — these are the switches that turn on real Groq calls)
   - `CORS_ALLOW_ORIGINS=["https://<your-vercel-app>.vercel.app"]` (you'll know this URL after step 2 below — come back and set it)
3. Deploy. Watch the build logs — the Node/pnpm install step adds a few minutes on first build (cached after).
4. Run migrations against the real DB once, from your machine: `cd apps/backend && DATABASE_URL=<sync-url-from-supabase> alembic upgrade head` (the free Render plan doesn't support `preDeployCommand`, so this is manual).

## 2. Frontend — Vercel

**[YOU]** in the Vercel dashboard:
1. New Project > import this repo.
2. Root Directory: `apps/frontend` (this is a pnpm workspace — Vercel needs to know the frontend isn't at the repo root).
3. Framework preset: Next.js (auto-detected). Install command: `pnpm install --frozen-lockfile` (Vercel usually auto-detects pnpm from `pnpm-lock.yaml`).
4. Env vars (`apps/frontend/.env.example`):
   - `NEXT_PUBLIC_API_URL=https://<your-render-backend>.onrender.com/api/v1` (get the exact URL from the Render dashboard after step 1 deploys)
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the frontend instantiates its own Supabase client directly for auth (`src/services/auth/supabaseClient.ts`) and **the build/runtime throws if these are missing** — this was undocumented before this deploy.
5. Deploy. Note the resulting `*.vercel.app` URL, then go back to Render and set `CORS_ALLOW_ORIGINS` to that exact URL (step 1.2).

No custom domain for now, per your answer — ship on the default `*.onrender.com` / `*.vercel.app` subdomains; a custom domain is a drop-in addition later in both dashboards.

## 3. Connect everything — checklist

- [ ] Groq: real API key set, `SPEECH_PROVIDER_NAME=groq`
- [ ] Supabase Auth: frontend logs in against the real Supabase project (no mock auth)
- [ ] Supabase Database: `alembic upgrade head` ran cleanly against the real Postgres
- [ ] Supabase Storage: bucket exists, service role key has access, uploads land there
- [ ] Redis: Render-managed instance, both backend and worker point at the same `REDIS_URL`
- [ ] Celery worker: shows "ready" in Render logs, picks up a test job

## 4. End-to-end verification

Run exactly: Login → Create Project → Upload MP4 → worker picks job → audio
extracted → Groq transcript → transcript validated → transcript stored
→ status = completed → frontend displays transcript. As of Sprint 7,
creative/caption/render planning and full MP4 export also run as part of
the same pipeline (see app.worker.ai_pipeline_stage, app.worker.render_stage)
— verify those too if QA-ing past the original Sprint 1.6 scope.

Check `GET /health/ready` on the deployed backend first — it reports
`database`/`redis` reachability and will catch most "it's not connected"
problems before you even try the UI flow.

### Post-Deploy Verification

Walk through this against the live `*.onrender.com` / `*.vercel.app` URLs,
not localhost:

- [ ] Login
- [ ] Create Project
- [ ] Upload MP4
- [ ] Job queued (visible in Render worker logs or job status endpoint)
- [ ] Worker processes job
- [ ] Transcript completed (status = completed, not stuck in processing)
- [ ] Transcript visible in UI
- [ ] Failed uploads handled correctly (bad file type / oversize gets a clean error, not a 500 or a hung job)
- [ ] Logs clean (no unhandled exceptions in backend or worker logs during the run)
- [ ] Health endpoint healthy (`/health/ready` returns 200 with both checks true)

## 5. Known deployment failure points to check if something breaks

- **Supavisor pooler GeoDNS mismatch**: `aws-1-ap-northeast-2.pooler.supabase.com` resolved and connected fine from a local (Seoul-region-adjacent) network but failed from Render's Oregon egress with `(ENOTFOUND) tenant/user postgres.<ref> not found` — Supabase's pooler DNS appears to be geo-routed and Render's request was landing on a different backend than the one that actually serves this project's tenant. Confirmed both underlying pooler IPs (`15.164.188.235`, `43.202.154.182`, found via `getaddrinfo`) work individually when connected to directly. Workaround in production: `DATABASE_URL_ASYNC`/`DATABASE_URL` on Render are pinned to the IP `43.202.154.182` instead of the hostname, bypassing DNS (safe here since `sslmode=require` doesn't verify hostname/cert anyway). This is fragile — Supabase doesn't guarantee pooler IP stability — so if the DB check on `/health/ready` starts failing again, re-resolve `aws-1-ap-northeast-2.pooler.supabase.com` and try both current IPs directly before assuming something else broke.

- **CORS**: `CORS_ALLOW_ORIGINS` must exactly match the Vercel origin (scheme + host, no trailing slash). `app/main.py` already reads this from config — no code change needed, just the env var.
- **Upload limits**: Render's default request body limit and `MAX_UPLOAD_SIZE_BYTES` (`app/core/config.py`) must agree — large videos can be rejected by the platform before your own limit even applies.
- **Worker connectivity**: worker and backend must use the identical `REDIS_URL` — in the blueprint both pull from the same `motionai-redis` service, so this should already be correct.
- **FFmpeg path**: `apps/backend/Dockerfile` installs `ffmpeg` via apt; `FfmpegAudioExtractor` and the render stage both shell out to the bare `ffmpeg`/`ffprobe` commands, which work as long as the Dockerfile's apt-get step succeeds and `ffmpeg`/`ffprobe` are on `PATH` — check build logs if transcription or rendering fails with a "file not found" style error (seen locally on a fresh Windows dev machine with no system ffmpeg install).
- **Storage permissions**: bucket must be private; `SupabaseStorageClient` uses the service role key, not anon key — if uploads/downloads 403, double-check `SUPABASE_SERVICE_ROLE_KEY` is the service role key, not the anon/public key. The bucket itself (`SUPABASE_STORAGE_BUCKET`, default `videos`) must also actually exist — it is not auto-created.
- **Reverse proxy / timeouts**: Groq transcription of a long video can take a while — `GROQ_TIMEOUT_SECONDS` (config.py) controls the provider's own HTTP timeout; Render's own request timeout only matters for the synchronous API, not the Celery worker, so this should mainly affect worker-side calls, which aren't subject to a web request timeout.

## 6. Manual QA matrix

Test against the live deployed app (not local):
- [ ] 20–30 varied real MP4s
- [ ] Silent video (expect speech stage to fail validation, job marked failed — not a crash)
- [ ] A long video (several minutes) — check `GROQ_TIMEOUT_SECONDS` is generous enough
- [ ] A corrupted/truncated upload (expect a clean 4xx, not a worker crash)
- [ ] Different aspect ratios (portrait/landscape — orthogonal to audio extraction, should just work)
- [ ] Non-English audio, if you want to confirm language auto-detection
- [ ] A large file near `MAX_UPLOAD_SIZE_BYTES`
- [ ] Two uploads started at the same time (confirms worker concurrency/locking from Sprint 1.3 holds up for real)

Log what actually breaks — that's the point of this step.

## 7. Tag

Once section 4 passes end-to-end against the live URLs and section 6's QA
matrix has been run for real:

```
git tag v0.1.0
git push origin v0.1.0   # only if/when you want the tag on the remote
```

I haven't tagged yet — tagging is the last step, after you've verified the
live app actually works, not before.

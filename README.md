# CapsEasy

AI captions for short-form and long-form video. Upload a video, get word-timed animated captions,
edit them in the browser, export burned-in MP4, transparent overlays, or subtitle files.

- **Web app + API:** Next.js on Vercel (`apps/frontend`)
- **Data, auth, storage, queue:** Supabase (Postgres + RLS + Storage + pg_cron)
- **Heavy work:** the CapsEasy Companion (`packages/companion`) runs on the user's own computer:
  local Whisper transcription and Remotion rendering, pulled from a job queue (no tunnels).

```bash
pnpm install
pnpm dev                 # web app on :3000
pnpm typecheck && pnpm test
pnpm companion:pack      # build the installable Companion into apps/frontend/public/companion
```

Architecture, database schema, API surface, test suites and the roadmap: see [CLAUDE.md](CLAUDE.md).

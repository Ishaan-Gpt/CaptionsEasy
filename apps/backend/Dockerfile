FROM python:3.11-slim

# ffmpeg is a hard runtime dependency of the speech provider
# (app/ai/providers/speech/audio_extractor.py shells out to the `ffmpeg`
# binary to demux audio from uploaded mp4/mov/webm videos).
#
# Node.js + pnpm are required because app/render/engine.py's default render
# path (USE_REMOTION_RENDER=true) shells out to `npx remotion render` in
# apps/remotion-pipeline — without a Node toolchain and that workspace's
# node_modules installed, every real render job fails.
#
# libnss3/libnspr4/libatk*/libcups2/libxcomposite1/libxdamage1/libgtk-3-0/
# fonts-liberation/libu2f-udev/xdg-utils are runtime deps of the headless
# Chromium that @remotion/renderer downloads and shells out to — without
# them the browser process fails to launch with
# "error while loading shared libraries: libnspr4.so: cannot open shared
# object file", confirmed by actually running a render in this image
# (ffmpeg's own dependency chain happens to cover the rest, e.g. libgbm1).
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg curl ca-certificates gnupg \
        libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
        libxcomposite1 libxdamage1 libgtk-3-0 fonts-liberation \
        libu2f-udev xdg-utils \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g pnpm@9 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY apps/backend/requirements.txt ./apps/backend/requirements.txt
RUN pip install --no-cache-dir -r apps/backend/requirements.txt

# Install only the remotion-pipeline workspace package (and its
# @motion-ai/caption-engine workspace dependency), not the whole monorepo
# (frontend's Next.js deps aren't needed here and would bloat the image).
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/remotion-pipeline ./apps/remotion-pipeline
COPY packages/caption-engine ./packages/caption-engine
RUN pnpm install --filter remotion-pipeline... --frozen-lockfile
# Bake in the headless Chromium Remotion renders with, so the first real
# render job doesn't pay a ~92MB download + doesn't depend on outbound
# network access to remotion.media at render time.
RUN cd apps/remotion-pipeline && npx remotion browser ensure

COPY apps/backend ./apps/backend
COPY packages ./packages
# app.ai.prompts.load_prompt resolves prompt templates relative to the repo
# root (apps/backend/app/ai/prompts.py -> 5 parents up) — without this, every
# real Groq creative/caption call would 500 with FileNotFoundError.
COPY prompts ./prompts

WORKDIR /app/apps/backend

ENV PYTHONPATH=/app
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

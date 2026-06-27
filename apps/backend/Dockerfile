FROM python:3.11-slim

# ffmpeg is a hard runtime dependency of the speech provider
# (app/ai/providers/speech/audio_extractor.py shells out to the `ffmpeg`
# binary to demux audio from uploaded mp4/mov/webm videos).
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY apps/backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/backend ./apps/backend
COPY packages ./packages

WORKDIR /app/apps/backend

ENV PYTHONPATH=/app
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

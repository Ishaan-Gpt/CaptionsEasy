# MotionAI Architectural Context & Final Plan

## 🎯 The Vision: Hybrid SaaS (BYOC)
MotionAI is pivoting from a heavy cloud-hosted processing model into a **Frictionless Hybrid SaaS (Bring Your Own Compute)** architecture. 

The goal is to provide a premium, real desktop web experience (Vercel + Supabase) while offloading all expensive video rendering (FFmpeg/Remotion) and AI processing to the user's own local PC. This eliminates server compute costs completely and scales infinitely for free.

---

## 🏛️ Architecture Overview

1. **The Cloud Frontend (Vercel + Supabase)**
   - The user visits the web app, authenticates via Supabase, and manages their video projects in a cloud dashboard.
   - Users upload raw videos to Supabase Storage and configure their subtitle presets in the browser.

2. **The Zero-Resistance Local Agent**
   - The user does **not** need to manually configure localhost servers, CORS, or firewalls.
   - They simply run a single 1-click command (e.g., `npx @motionai/agent` or run a standalone `.exe`).
   - The agent silently downloads all necessary dependencies (Remotion, FFmpeg) into a hidden local folder. No manual installations are required.

3. **The Outbound Connection (Realtime DB)**
   - The Local Agent establishes an outbound WebSocket connection to the **Supabase Realtime Database**.
   - It listens securely to the `Jobs` table for any tasks matching the user's `user_id`.
   - When the user clicks "Export" on the Web UI, a job is written to Supabase. The agent instantly detects this, downloads the raw video, renders it using the full power of their PC's CPU/GPU, and uploads the final MP4 back to Supabase.

---

## 🔑 Monetization & API Key Strategy (Freemium + BYOK)

Because the user is providing their own compute, the only remaining cost for the platform is the AI APIs (e.g., Groq for Whisper transcription and LLM pacing). 

To balance a great onboarding experience with sustainable economics, the platform uses a hybrid API key model:

1. **Free Tier (Platform APIs)**
   - When a user first signs up, the local agent securely proxies requests through the Vercel backend to use the *Platform's* central Groq API keys. 
   - Supabase tracks the user's usage.

2. **The Paywall & Upgrades**
   - Once a user consumes their free quota, they are hit with a paywall.
   - **Option A (Convenience)**: Upgrade to a Paid SaaS plan. The platform continues to manage API keys and backend proxying for them.
   - **Option B (Developer Free Tier - BYOK)**: The user can "Bring Their Own Key". They input their own Groq API key into their local agent, bypassing the platform proxy, and can continue generating videos entirely for free using their own compute and API usage.

---

## 🛠️ The Rendering Engine (Remotion + FFmpeg)
*   **Is FFmpeg still used?** Yes. Remotion uses FFmpeg under the hood to encode the final video.
*   **The Pivot:** We are abandoning the legacy Python `engine.py` (which used raw `.ass` subtitles) and elevating the `remotion-pipeline` as the core rendering engine. This provides the highest quality, pixel-perfect results using React and CSS animations instead of legacy subtitle formats.

## 🔴 Deprecated Architecture (DO NOT USE)
- No Celery workers.
- No heavy Python FFmpeg Docker instances on Render.
- No `localhost:8000` inbound API servers that the browser tries to talk to. All local-to-cloud communication happens outbound via Supabase Realtime.

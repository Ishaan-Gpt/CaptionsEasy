# MOTIONAI - PROJECT OVERVIEW
Version: 1.0
Priority: MUST READ
Audience:
- Claude Code
- Lovable
- Gemini
- Human Developers

---

# 1. PROJECT SUMMARY

MotionAI is an AI-powered SaaS platform that converts ordinary videos into highly engaging social-media-ready videos by automatically generating cinematic captions, motion typography and visual emphasis.

The long-term goal is **not** to become another subtitle generator.

The goal is to become an AI Creative Editor.

Version 1 focuses exclusively on cinematic captions because captions are the highest-value feature with the smallest engineering scope.

Future features will build on the same architecture without requiring rewrites.

Examples include:

- AI Shorts Generator
- Thumbnail Generator
- Hook Detection
- Highlight Extraction
- Brand Kit
- Team Collaboration
- API Access
- Template Marketplace

Therefore every architectural decision must optimize for extensibility rather than only solving today's feature.

---

# 2. TARGET USERS

Primary Users

• Content Creators

• Instagram Creators

• YouTubers

• Agencies

• Podcast Editors

• Freelance Editors

Secondary Users

• Marketing Teams

• SaaS Companies

• Coaches

• Course Creators

Users are NOT professional video editors.

The interface must therefore prioritize simplicity over flexibility.

---

# 3. CORE PROBLEM

Today creating high-quality captions requires:

Upload video

↓

Speech-to-text

↓

Manually fixing transcript

↓

Creating captions

↓

Choosing fonts

↓

Animating every word

↓

Adding emphasis

↓

Rendering

↓

Exporting

This process takes between 15 and 60 minutes for a one-minute video.

MotionAI reduces this to:

Upload

↓

Choose Style

↓

Export

Target completion time:

<3 minutes.

---

# 4. PRODUCT PHILOSOPHY

MotionAI is NOT an editor.

MotionAI is an intelligent rendering pipeline.

The user should spend time making creative decisions rather than technical decisions.

Every feature should answer one question:

"Does this reduce creative friction?"

If not,

it probably doesn't belong in Version 1.

---

# 5. VERSION 1 FEATURE SET

Version 1 intentionally ships with a limited feature set.

Core Features

✅ Authentication

✅ Dashboard

✅ Upload Video

✅ AI Caption Generation

✅ Four Caption Styles

• Formal

• Sarcastic

• Humorous Tech

• Humorous Non-Tech

✅ Cinematic Typography

✅ Motion Animations

✅ Preview

✅ Export

Everything else is postponed.

Version 1 does NOT include:

❌ Timeline Editing

❌ Multi-user Collaboration

❌ Brand Kits

❌ Translation

❌ AI Shorts

❌ Thumbnail Generator

❌ Mobile App

❌ Public API

These are future modules.

---

# 6. SUCCESS METRICS

Technical Success

Video upload success >99%

Average processing time <3 min

Average render failure <1%

Crash rate <0.5%

API latency <300ms

Business Success

100 active users

1000 exports

100 paying users

MRR >$1,000

Long-term target:

10,000+ active users.

---

# 7. ENGINEERING PHILOSOPHY

The architecture follows five rules.

Rule 1

AI makes decisions.

Software executes them.

Rule 2

Every component has exactly one responsibility.

Rule 3

Everything expensive is asynchronous.

Rule 4

Every AI output becomes structured JSON.

Never rely on free-form AI text.

Rule 5

Rendering is deterministic.

The renderer never asks AI anything.

---

# 8. TECHNOLOGY STACK

Frontend

Next.js

TypeScript

Tailwind

shadcn/ui

Backend

FastAPI

Python

Workers

Celery

Redis Queue

Database

Supabase PostgreSQL

Storage

Supabase Storage

Rendering

FFmpeg

AI

Groq API (current speech/creative/caption provider)

Fireworks API

Gemini

Future support for multiple providers.

---

# 9. HIGH LEVEL PIPELINE

Upload

↓

Store Video

↓

Create Processing Job

↓

Speech Analysis

↓

Vision Analysis

↓

Creative Planning

↓

Caption Planning

↓

Motion Planning

↓

Render Plan

↓

Renderer

↓

Export

Every stage stores structured outputs.

---

# 10. PROJECT PRINCIPLES

Every uploaded video becomes structured knowledge.

Everything is versioned.

Everything is resumable.

Everything is replaceable.

No component depends directly on another implementation.

Only contracts.

---

# 11. DIRECTORY STRUCTURE

motion-ai/

apps/

packages/

docs/

contracts/

prompts/

workers/

scripts/

docker/

No random folders.

---

# 12. DEFINITION OF DONE

A feature is complete only if:

Code compiles.

Tests pass.

Documentation updated.

API documented.

Error handling added.

Loading state added.

Empty state added.

Failure state added.

Logs added.

Telemetry added.

---

# 13. WHAT AI SHOULD NEVER DO

Never invent APIs.

Never invent database columns.

Never duplicate business logic.

Never hardcode prompts.

Never directly render videos.

Never mix frontend and backend logic.

Never bypass documented interfaces.

If information is missing,

request clarification rather than inventing architecture.

---

END OF DOCUMENT

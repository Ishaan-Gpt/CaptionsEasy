# JSON Schemas Specification

Version: 1.0

## Purpose

This document defines every JSON contract used inside MotionAI.

AI models never return free-form text.

Every AI output must validate against a JSON Schema before being accepted.

Backend services must reject invalid outputs.

---

# Principles

* JSON only
* Deterministic
* Versioned
* Strict validation
* No optional business-critical fields

---

# AI Pipeline

Transcript

↓

Creative Plan

↓

Caption Plan

↓

Render Plan

Each stage consumes the previous stage.

Each stage produces exactly one JSON document.

---

# Transcript Schema

Purpose

Represents speech recognition output.

Contains

* language
* duration_ms
* words

Every word contains

* text
* start_ms
* end_ms
* confidence

Transcript never contains styling.

---

# Creative Plan Schema

Purpose

Represents the AI's understanding of the video.

Contains

* speaking_style
* emotion
* pacing
* energy_curve
* audience
* key_moments
* recommended_style

Creative Plan contains no rendering instructions.

---

# Caption Plan Schema

Purpose

Represents caption segmentation.

Contains

caption_segments

Each segment contains

* id
* text
* start_ms
* end_ms
* emphasis
* confidence

Caption Plan never contains font information.

Caption Plan never contains animation.

---

# Render Plan Schema

Purpose

Represents rendering instructions.

Contains

* metadata
* global_settings
* assets
* timeline

Renderer consumes this directly.

---

# Job Status Schema

Contains

* id
* stage
* progress
* status
* estimated_remaining_ms
* error

Used by frontend progress UI.

---

# API Error Schema

Contains

* code
* message
* details
* retryable
* timestamp

Used consistently across all APIs.

---

# User Schema

Contains

* id
* email
* name
* avatar

Never expose authentication secrets.

---

# Project Schema

Contains

* id
* title
* status
* thumbnail
* created_at
* updated_at

---

# Video Schema

Contains

* id
* duration_ms
* width
* height
* fps
* codec
* storage_path

---

# Export Schema

Contains

* id
* resolution
* quality
* download_url
* render_time_ms
* file_size

---

# Validation Rules

Every schema must:

* Define required fields.
* Reject unknown fields.
* Validate types.
* Validate enums.
* Validate timestamps.
* Validate IDs.

No schema may accept arbitrary objects.

---

# Versioning

Every schema contains

version

Future versions must remain backward compatible.

---

# Acceptance Criteria

Claude Code must generate:

* JSON Schema Draft 2020-12
* TypeScript interfaces
* Python Pydantic models
* Runtime validators
* Example JSON documents

No schema may conflict with api.md, database.md or renderplan.md.

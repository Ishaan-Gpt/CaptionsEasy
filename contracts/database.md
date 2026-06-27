# Database Architecture Specification

Version: 1.0

## Purpose

This document is the single source of truth for the MotionAI database architecture.

Claude Code must generate the SQL schema from this document.

Do not invent additional tables unless explicitly marked as Future.

---

# Database

Engine: PostgreSQL

Provider: Supabase

Extensions:

* uuid-ossp
* pgcrypto

Primary Keys:

* UUID v4

Soft Deletes:

* Enabled where applicable using `deleted_at`

Timestamps:

Every table contains:

* created_at
* updated_at

---

# Relationships

User

↓

Projects

↓

Videos

↓

Processing Jobs

↓

AI Outputs

↓

Exports

Every entity belongs to exactly one Project.

---

# Tables

## profiles

Purpose

Stores public user information.

Columns

* id
* auth_user_id
* full_name
* avatar_url
* created_at
* updated_at

---

## projects

Purpose

Represents one editing workspace.

Columns

* id
* owner_id
* title
* description
* status
* thumbnail_url
* created_at
* updated_at
* deleted_at

Relationship

One Project

↓

Many Videos

---

## videos

Purpose

Original uploaded media.

Columns

* id
* project_id
* storage_path
* duration_ms
* width
* height
* fps
* codec
* file_size
* uploaded_at

Relationship

One Video

↓

One Transcript

↓

One Motion Script

↓

Many Exports

---

## jobs

Purpose

Background processing queue.

Status Enum

* queued
* processing
* completed
* failed
* cancelled

Columns

* id
* project_id
* job_type
* status
* progress
* started_at
* finished_at
* error_message

---

## transcripts

Purpose

Stores speech-to-text output.

Columns

* id
* project_id
* language
* provider
* version
* transcript_json

Only structured JSON.

Never plain text.

---

## creative_plans

Purpose

High-level AI understanding.

Contains

* pacing
* emotion
* speaking_style
* energy_curve
* key_moments

Stored as JSON.

---

## caption_plans

Purpose

Caption segmentation.

Contains

* caption_json

Every caption references timestamps.

No rendering information.

---

## motion_scripts

Purpose

Primary AI output.

Contains

* motion_script_json
* version

This becomes the renderer input.

No FFmpeg commands stored here.

---

## exports

Purpose

Rendered videos.

Columns

* id
* project_id
* resolution
* quality
* storage_path
* render_duration_ms
* created_at

---

## usage

Purpose

Track SaaS limits.

Columns

* user_id
* uploads_used
* renders_used
* ai_tokens_used
* storage_used

---

# Indexing

Create indexes on

* owner_id
* project_id
* status
* created_at

All foreign keys indexed.

---

# Constraints

* No orphan records.
* Foreign keys required.
* Cascade deletes only where safe.
* Soft delete preferred.

---

# Row Level Security

Every authenticated user may access only their own records.

Policies must exist for:

* SELECT
* INSERT
* UPDATE
* DELETE

Never expose another user's data.

---

# JSON Columns

Use JSONB for:

* transcript_json
* creative_plan
* caption_plan
* motion_script

Never serialize JSON as text.

---

# Future Tables (Not MVP)

* subscriptions
* billing
* teams
* api_keys
* templates
* brand_kits
* notifications

Claude Code must NOT implement these unless Sprint documents explicitly require them.

---

# Acceptance Criteria

Claude Code must generate:

* Normalized schema
* Foreign keys
* Indexes
* Enums
* RLS policies
* Alembic migration
* SQLAlchemy models
* Pydantic models

without inventing additional business entities.


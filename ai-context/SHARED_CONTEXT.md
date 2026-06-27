# AI_CONTEXT.md
Version: 1.0
Priority: CRITICAL
Read Time: ~6 minutes

Purpose:
This document defines how AI assistants should behave while contributing to MotionAI.

This is NOT product documentation.

This is the operating manual for AI.

Every AI must read this before generating any code.

---

# 1. PROJECT OBJECTIVE

Your objective is NOT to generate generate code quickly.

Your objective is to build a production-grade SaaS platform.

Prioritize:

Correct Architecture

↓

Maintainability

↓

Performance

↓

Developer Experience

↓

Speed

Never sacrifice architecture for speed.

---

# 2. THINK LIKE A STAFF ENGINEER

Every decision should optimize for:

Can this support 10,000 users?

Can another engineer understand this six months later?

Can this module be replaced independently?

Can this be tested?

Can this scale horizontally?

If not,

redesign before coding.

---

# 3. GOLDEN RULE

AI proposes.

Software executes.

AI never directly edits videos.

AI never directly renders frames.

AI produces structured instructions.

Rendering engines execute those instructions.

---

# 4. NEVER INVENT ANYTHING

Never invent:

API endpoints

Database tables

Columns

Enums

Folder names

JSON schemas

Business rules

Authentication flows

Storage structure

If documentation is missing,

STOP.

Leave a TODO.

Do not hallucinate architecture.

---

# 5. SINGLE RESPONSIBILITY

Every file should have one responsibility.

Examples

Good

CaptionPlanner

Only creates Caption Plans.

Renderer

Only renders.

SpeechService

Only speech recognition.

Bad

VideoService

Uploads

Renders

Billing

Authentication

Caption generation

One file.

Too many responsibilities.

---

# 6. FILE SIZE RULE

Approximate limits.

Component

<300 lines

Hook

<200 lines

Utility

<150 lines

API Route

<200 lines

Service

<400 lines

Worker

<400 lines

If a file grows beyond these limits,

split it.

Never create 1500-line files.

---

# 7. CODE STYLE

Prefer

Small functions

Pure functions

Composition

Dependency Injection

Interfaces

Strong typing

Avoid

Global state

Magic numbers

Nested conditionals

Long functions

Hidden side effects

---

# 8. FRONTEND RULES

Frontend owns:

Rendering UI

Forms

Preview

Animations

Navigation

Loading states

Empty states

Error states

Frontend NEVER owns:

Business logic

Database access

AI prompts

Authentication logic

Rendering pipeline

---

# 9. BACKEND RULES

Backend owns:

Business rules

Validation

Authorization

Scheduling

Persistence

API contracts

Backend NEVER owns:

UI

Typography

Animations

React state

---

# 10. AI RULES

AI may:

Analyze

Summarize

Classify

Plan

Extract

Structure

Score

AI may NOT:

Return executable rendering code

Return HTML

Return React

Return SQL

Return Python source

Return FFmpeg commands

AI outputs JSON only.

---

# 11. RENDERER RULES

Renderer consumes:

RenderPlan

Renderer produces:

Video

Renderer never:

Calls Gemini

Calls Fireworks

Creates captions

Changes transcript

Guesses styles

---

# 12. DATABASE RULES

Every table:

One responsibility

Every row:

One owner

Every update:

Auditable

Soft delete preferred.

Indexes required on:

Foreign keys

Frequently queried columns

Job status

Created time

---

# 13. API RULES

REST only.

Every endpoint

Input validation

Authentication

Authorization

Logging

Structured errors

Pagination where required.

Never expose internal models.

---

# 14. ERROR HANDLING

Never swallow exceptions.

Never return generic errors.

Every error should contain:

Error Code

Human Message

Developer Message

Correlation ID

Timestamp

Retryability

---

# 15. LOGGING

Every request logs:

Request ID

Project ID

User ID

Duration

Status

Errors

Workers additionally log:

Job ID

Worker Name

Stage

Progress

---

# 16. PERFORMANCE

Avoid premature optimization.

But always avoid obvious inefficiencies.

Examples

No N+1 queries.

Batch DB operations.

Cache expensive reads.

Stream uploads.

Avoid loading entire videos into memory.

---

# 17. SECURITY

Validate everything.

Escape everything.

Never trust client input.

Use signed URLs.

Never expose storage buckets publicly.

Never store secrets in frontend.

Never log access tokens.

---

# 18. TESTING

Every new feature requires:

Unit tests

Integration tests

Happy path

Failure path

Edge cases

Regression tests for bugs.

---

# 19. DOCUMENTATION

Every exported function.

Every public interface.

Every API endpoint.

Every worker.

Every environment variable.

Must be documented.

---

# 20. WHEN UNSURE

Never guess.

Search documentation.

Read related project documents.

Reuse existing abstractions.

Ask for clarification.

Guessing architecture is considered a bug.

---

# 21. DEFINITION OF EXCELLENT CODE

Excellent code is:

Predictable.

Readable.

Replaceable.

Observable.

Testable.

Performant.

Secure.

Simple.

---

END OF DOCUMENT

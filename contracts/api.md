document: API-001
title: MotionAI API Contract
version: 1.0
priority: CRITICAL
audience:
  - Claude Code
  - Lovable
depends_on:
  - PROJECT_OVERVIEW.md
  - PRD.md
status: ACTIVE
---

# MotionAI API Contract

## Purpose

This document is the authoritative specification for every public backend endpoint.

Rules

- REST only
- JSON only
- Versioned
- Stateless
- JWT Protected (except auth endpoints)
- No frontend assumptions

---

# API Version

Current

/api/v1

Future

/api/v2

Never break existing versions.

---

# Standard Response Format

Success

```json
{
  "success": true,
  "data": {},
  "meta": {},
  "error": null
}
```

Failure

```json
{
  "success": false,
  "data": null,
  "error": {
      "code":"VIDEO_TOO_LARGE",
      "message":"Maximum upload size exceeded."
  }
}
```

Every endpoint follows this format.

---

# Authentication

## POST

/auth/register

Request

```json
{
    "name":"",
    "email":"",
    "password":""
}
```

Response

```json
{
 "user":{},
 "token":""
}
```

---

POST

/auth/login

---

POST

/auth/logout

---

POST

/auth/refresh

---

GET

/auth/me

Returns current user.

---

# Projects

GET

/projects

Returns paginated projects.

---

POST

/projects

Creates project.

Body

```json
{
    "title":"Podcast Episode"
}
```

Returns

Project Object

---

GET

/projects/{id}

Returns complete project.

---

PATCH

/projects/{id}

Rename

Archive

Favorite

---

DELETE

/projects/{id}

Soft delete.

---

# Upload

POST

/projects/{id}/upload

Multipart upload.

Returns

```json
{
 "videoId":"",
 "status":"UPLOADED"
}
```

---

GET

/projects/{id}/upload/status

Returns

```json
{
 "status":"PROCESSING"
}
```

---

# AI Processing

POST

/projects/{id}/process

Starts AI pipeline.

Returns

Job ID

---

GET

/jobs/{id}

Returns

```json
{
 "progress":42,
 "stage":"Speech Analysis"
}
```

---

GET

/projects/{id}/transcript

Returns transcript.

---

GET

/projects/{id}/caption-plan

Returns CaptionPlan.

---

GET

/projects/{id}/render-plan

Returns RenderPlan.

---

# Preview

GET

/projects/{id}/preview

Returns temporary preview URL.

---

# Export

POST

/projects/{id}/export

Request

```json
{
 "resolution":"1080p",
 "quality":"high"
}
```

Returns

Job ID.

---

GET

/projects/{id}/exports

Returns export history.

---

GET

/exports/{id}

Returns export metadata.

---

# Billing

GET

/billing

Current subscription.

---

POST

/billing/checkout

Create checkout.

---

POST

/billing/webhook

Provider webhook.

---

# Settings

GET

/settings

PATCH

/settings

---

# Usage

GET

/usage

Returns

Credits

Uploads

Exports

Storage

---

# WebSocket Events

Event

Project Updated

```json
{
 "projectId":"",
 "status":"PROCESSING"
}
```

---

Event

Progress

```json
{
 "progress":65
}
```

---

Event

Render Finished

```json
{
 "downloadUrl":""
}
```

---

# HTTP Status Codes

200 OK

201 Created

202 Accepted

204 Deleted

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Validation Error

429 Rate Limited

500 Internal Error

503 Service Unavailable

---

# API Principles

Every endpoint:

✓ authenticated

✓ validated

✓ logged

✓ documented

✓ rate limited

✓ versioned

✓ typed

Never expose:

Database IDs that are internal

Storage bucket paths

Stack traces

Secrets

Internal provider APIs

---

END OF DOCUMENT

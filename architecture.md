# MotionAI System Architecture & Workflow

This document provides a comprehensive, all-inclusive architectural and workflow specification for the **MotionAI** SaaS platform, mapping the interaction between the Next.js frontend, FastAPI backend, Redis brokers, Celery asynchronous processing workers, database models, and the deterministic rendering engine.

---

## 🏛️ System Topology

The system comprises five core architectural tiers:
1. **Client Tier**: Next.js (TypeScript, React, TailwindCSS) communicating with Supabase Auth for identity management, and the FastAPI API for orchestrating video project state.
2. **API Tier**: FastAPI (Python 3.11) exposing secure endpoints, enforcing Redis-backed sliding-window rate limiting, and updating metadata state in the PostgreSQL database.
3. **Queue & Broker Tier**: Redis cache serving as the Celery message broker, rate-limiter backend, progress-tracking repository, and distributed job-locking mechanism.
4. **Asynchronous Worker Tier (Celery)**: Parallel execution workers running:
   - **AI Orchestration Pipeline**: Whisper-based transcription, creative analysis, caption generation, and style compilation.
   - **Deterministic Rendering Engine**: Subtitle generation, FFmpeg burning, and video encoding.
   - **Scheduler (Beat) & Cleanup Pipelines**: Automated recovery, project deletion cleanup, and daily retention runs.
5. **Data & Storage Tier**: 
   - **PostgreSQL**: Relational database storing user profiles, projects, videos, transcripts, motion scripts, and jobs.
   - **Supabase Storage**: Object storage container hosting raw uploaded videos and final rendered export MP4s.

```mermaid
graph TB
    subgraph Client Tier [Client Tier]
        User[Next.js Web Client]
        SupaAuth[Supabase Auth]
    end

    subgraph API Tier [API Tier]
        FastAPI[FastAPI Backend]
        RateLimit[Redis Rate Limiter]
    end

    subgraph Queue & Broker [Queue & Broker Tier]
        RedisBroker{Redis Broker & Store}
    end

    subgraph Asynchronous Worker Tier [Celery Worker Cluster]
        CeleryWorker[Celery Task Runner]
        CeleryBeat[Celery Beat Scheduler]
        
        subgraph AI_Pipe [AI Pipeline]
            Speech[Groq Speech-to-Text]
            Creative[Creative Pacing Provider]
            Caption[Caption Plan Provider]
            MotionScript[Style & MotionScript Gen]
        end

        subgraph Render_Engine [Render Engine]
            ASSGen[ASS Subtitle Generator]
            FFmpeg[FFmpeg Overlay & Encode]
        end
    end

    subgraph Data & Storage Tier [Data & Storage Tier]
        DB[(PostgreSQL Database)]
        Storage[(Supabase Storage)]
    end

    %% Client Interactions
    User -->|1. Authenticate| SupaAuth
    User -->|2. Send Requests + JWT| FastAPI
    FastAPI <-->|Rate Limit Check| RateLimit
    
    %% API Actions
    FastAPI -->|Write metadata| DB
    FastAPI -->|Trigger task| RedisBroker
    
    %% Worker Actions
    RedisBroker -->|Dispatch Job| CeleryWorker
    CeleryBeat -->|Trigger cleanups| RedisBroker
    
    %% Worker Pipelines
    CeleryWorker -->|Run AI Pipeline| AI_Pipe
    CeleryWorker -->|Run Rendering| Render_Engine
    
    %% AI Pipeline External
    Speech <-->|Speech Analysis| Groq[Groq API / LLM]
    Creative <-->|Creative Analysis| LLM[LLM Orchestrator]
    
    %% Storage & DB Interactions
    CeleryWorker <-->|Read / Write Metadata| DB
    CeleryWorker <-->|Download / Upload Assets| Storage
    FastAPI <-->|Signed URL Retrieval| Storage
```

---

## 🔄 Core Workflows

### 1. End-to-End Video Processing & Upload Workflow

The sequence below illustrates the process when a user uploads a raw video, initiates AI transcription and design, edits styling, and exports the rendered video.

```mermaid
sequenceDiagram
    autonumber
    actor User as Next.js Web Client
    participant API as FastAPI Backend
    participant DB as PostgreSQL
    participant Storage as Supabase Storage
    participant Redis as Redis Broker/Progress
    participant Worker as Celery Worker

    %% Phase 1: Upload & Registration
    User->>API: POST /api/v1/upload/presign (Get upload policy)
    API-->>User: Signed URL & Upload Policy
    User->>Storage: Direct Binary Upload (Raw Video)
    User->>API: POST /api/v1/projects (Create Project with video URL)
    API->>DB: Save Project & Video rows (Status: DRAFT)
    API-->>User: Project Created (ID)

    %% Phase 2: AI Pipeline Trigger
    User->>API: POST /api/v1/jobs (Type: ai_pipeline)
    API->>DB: Create Job (Status: pending)
    API->>Redis: Enqueue 'motionai.process_job'
    API-->>User: Job Dispatched (ID)

    %% Phase 3: AI Worker Pipeline Execution
    Note over Worker, Redis: Worker fetches job details
    Worker->>DB: Update Job status (processing)
    Worker->>Storage: Download raw video metadata
    
    rect rgb(240, 245, 255)
        Note over Worker, AI_Pipe: AI Execution Substages
        Worker->>Worker: Run Stage 1: Transcription (Whisper via Groq)
        Worker->>Worker: Run Stage 2: Creative Analysis (Pacing/Tone)
        Worker->>Worker: Run Stage 3: Caption Plan (Word timings)
        Worker->>Worker: Run Stage 4: Style & MotionScript generation
    end
    
    Worker->>DB: Persist Transcript, CreativePlan, CaptionPlan, MotionScript
    Worker->>DB: Update Project Status to READY, Job to COMPLETED
    Worker->>Redis: Write final progress (100%)
    
    %% Phase 4: Poll Status
    loop Poll Progress
        User->>API: GET /api/v1/jobs/{job_id}/progress
        API->>Redis: Read cached progress
        Redis-->>API: Progress percentage (%)
        API-->>User: Returns Progress (e.g. 75%)
    end
    User-->>User: UI updates to show Transcribed text & Caption Editor
```

---

### 2. The AI Orchestration Pipeline

MotionAI enforces a strict contract-driven, step-by-step pipeline where the output of each AI provider maps to a structured JSON format and database schema.

```mermaid
graph LR
    Video[Raw Video File] --> Speech[SpeechProvider]
    Speech -->|Whisper Transcription| Transcript[Transcript JSON]
    Transcript --> Creative[CreativeProvider]
    Creative -->|CreativePlan JSON| Caption[CaptionProvider]
    Caption -->|CaptionPlan JSON| RenderPlan[RenderPlanProvider]
    RenderPlan -->|StylePreset + MotionScript IR| DB[(PostgreSQL)]
    
    subgraph Output Validation
        Transcript -.->|Validate| V1[v1 Schema]
        Creative -.->|Validate| V2[Plan Contract]
        Caption -.->|Validate| V3[Word Timings]
        RenderPlan -.->|Validate| V4[MotionScript Validation]
    end
```

---

### 3. The Deterministic Render Engine Workflow

When the user is satisfied with the edits (e.g. modified wording or style templates) and requests an export:

```mermaid
sequenceDiagram
    autonumber
    actor User as Next.js Web Client
    participant API as FastAPI Backend
    participant DB as PostgreSQL
    participant Worker as Celery Worker
    participant Storage as Supabase Storage
    participant Engine as RenderEngine (FFmpeg)

    User->>API: POST /api/v1/jobs (Type: render)
    API->>DB: Create Job (Status: pending)
    API->>Redis: Enqueue 'motionai.process_job'
    API-->>User: Job Dispatched (ID)
    
    %% Worker Execution
    Worker->>DB: Query Latest Video and MotionScript rows
    Worker->>Storage: Download raw video to local temp file
    
    %% Render Engine Stages
    rect rgb(245, 240, 245)
        Note over Worker, Engine: Render Engine Executions
        Worker->>Engine: Run generate_ass(MotionScript)
        Engine-->>Worker: Subtitle script file (.ass)
        Worker->>Engine: Run render() (FFmpeg filter graph overlay)
        Note over Engine: FFmpeg burns ASS subtitles,<br/>applies custom font face, bounding boxes,<br/>pacing animations, and encodes H264 video
        Engine-->>Worker: Rendered output local file (output_*.mp4)
    end
    
    Worker->>Storage: Upload rendered MP4 output file
    Worker->>DB: Save Export record & update Job status (completed)
    Worker->>DB: Update Project Status to COMPLETED
    Worker-->>User: Export available to view and download
```

---

## 🧹 Background Maintenance & Reliability Operations

The platform uses scheduled Celery Beat tasks and transactional safeguards to maintain system cleanliness and handle failure states:

```mermaid
grid
    %% Grid layout representing maintenance tasks
```

### Stuck Job Recovery
- **Trigger**: Hourly poller (`motionai.recover_failed_jobs`).
- **Mechanism**: Queries `Job` table for runs stuck in `processing` state for $> 30\text{ minutes}$.
- **Resolution**: Resets job status to `failed` and transitions project status to `FAILED`, preventing hung processes from locking user interfaces.

### Project Cascading Storage Purge
- **Trigger**: Project deletion hook (`motionai.cleanup_project_storage`).
- **Mechanism**: Runs asynchronously to delete all raw user-uploaded videos and rendered export files stored under the project path `projects/{project_id}/` in Supabase Storage.

### Export Expiration Lifecycle
- **Trigger**: Daily runner (`motionai.cleanup_old_exports`).
- **Mechanism**: Sweeps database for exports created $> 7\text{ days}$ ago.
- **Resolution**: Deletes files from Supabase Storage and marks export database records as `expired` to manage cloud storage costs.

---

## 💾 Relational Data Schema Map

The core tables used to orchestrate the backend state machine:

```mermaid
erDiagram
    PROFILES {
        uuid id PK
        uuid auth_user_id UK
        datetime created_at
        datetime updated_at
    }
    PROJECTS {
        uuid id PK
        uuid user_id FK "Profiles.id"
        string name
        string status "DRAFT | PROCESSING | READY | COMPLETED | FAILED"
        string style "e.g., kalakar, minimal"
        string caption_template
        datetime created_at
    }
    VIDEOS {
        uuid id PK
        uuid project_id FK "Projects.id"
        string storage_path "Path in Supabase Storage"
        integer duration_ms
        integer width
        integer height
        datetime created_at
    }
    TRANSCRIPTS {
        uuid id PK
        uuid project_id FK "Projects.id"
        string language
        string provider
        integer version
        jsonb transcript_json "Whisper word segment array"
    }
    CREATIVE_PLANS {
        uuid id PK
        uuid project_id FK "Projects.id"
        jsonb creative_plan "Pacing & Emphasis data"
    }
    CAPTION_PLANS {
        uuid id PK
        uuid project_id FK "Projects.id"
        jsonb caption_json "Word highlights and timings"
    }
    MOTION_SCRIPTS {
        uuid id PK
        uuid project_id FK "Projects.id"
        integer version
        jsonb motion_script_json "Renderer instructions IR"
    }
    EXPORTS {
        uuid id PK
        uuid project_id FK "Projects.id"
        string resolution
        string quality
        string storage_path
        integer render_duration_ms
        integer file_size
        string status "completed | expired"
    }
    JOBS {
        uuid id PK
        uuid project_id FK "Projects.id"
        string job_type "ai_pipeline | render"
        string status "pending | processing | completed | failed"
        string error_message
        datetime started_at
        datetime finished_at
    }

    PROFILES ||--o{ PROJECTS : owns
    PROJECTS ||--o{ VIDEOS : contains
    PROJECTS ||--o{ TRANSCRIPTS : generates
    PROJECTS ||--o{ CREATIVE_PLANS : evaluates
    PROJECTS ||--o{ CAPTION_PLANS : outlines
    PROJECTS ||--o{ MOTION_SCRIPTS : schedules
    PROJECTS ||--o{ EXPORTS : produces
    PROJECTS ||--o{ JOBS : executes
```

# Graph Report - CaptionsEasy  (2026-09-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2651 nodes · 5945 edges · 146 communities (113 shown, 33 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 533 edges (avg confidence: 0.94)
- Token cost: 242,209 input · 2,453 output

## Graph Freshness
- Built from commit: `baa9a8d6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Speech Provider Settings
- Project Management API
- Pipeline Structured Logging
- Worker Job Endpoints
- Draggable Caption Overlay UI
- Worker Pairing Endpoints
- AI Pipeline DI Container
- AI Engine Assembly
- API Bootstrap & Rate Limiting
- Audio Extraction
- Plan/Export Schemas
- Creative Plan JSON Schema
- Caption/Creative Providers
- Fake Test Service Doubles
- App Error Handling
- Render Pipeline Stages
- FastAPI Dependency Providers
- Caption Plan JSON Schema
- AI Orchestration Engine Tests
- API Entity Pydantic Models
- Transcript JSON Schema
- Motion Studio Editor Pages
- Dummy Render Plan Logic
- Landing Page Sections
- Dashboard & Settings Pages
- Render Plan Style Tests
- MotionScript Schema (Python)
- Video JSON Schema
- Caption Payload Schema
- Worker Job Pipeline Runner
- Export JSON Schema
- Job Status JSON Schema
- Frontend Lint/Package Config
- Project JSON Schema
- Prompt Loading & Dead Letter
- ASS Subtitle Rendering
- Sidebar Template Controls UI
- Render Plan JSON Schema
- Landing Page Fonts/Scenes
- Motion Composition Animations
- Render Plan TS Types
- Local Worker Pairing Tool
- Frontend Dependencies
- Caption Engine Package Config
- Auth Pages (Login/Reset)
- API Error JSON Schema
- Speech-Only Engine Build
- Workspace Export/Header UI
- Frontend API Client
- Frontend TS Config
- Render Metadata Schema
- User JSON Schema
- Project Workspace Editor UI
- Supabase Auth Provider
- Frontend Projects Service
- Worker Job Execution
- Caption Engine Dependencies
- UI Component Library
- Export Settings Schema
- Style Preset Manager
- Timeline Event Schema
- Supabase JWT Verification
- Frontend Upload Service
- Project Style Schema
- Frontend Dev Dependencies
- Render Plan Enums Schema
- Audio Effect Schema
- Transition Payload Schema
- DB Migrations (Schema)
- Dummy Worker Pipeline Stages
- MotionScript Endpoint Tests
- Worker Retry/Lifecycle Tests
- Camera Payload Schema
- Margin/Box Schema
- Remotion Chart Animations
- AI Pipeline Stage Tests
- Worker Job Repository
- Fake Worker Job Repository
- Remotion Pipeline TS Config
- Caption Engine TS Config
- Emoji Payload Schema
- Transcript Repository
- Render Engine Font/Text Utils
- Worker Job Locking Tests
- Frontend Motion Script Tests
- Asset Schema
- Canvas Size Schema
- DB Migrations (Presets/Redis)
- Celery App & Worker Logging
- Typography Composition & Fonts
- Pipeline Metrics Recorder
- Provider Registry
- Caption Plan Repository
- Motion Script Repository
- Worker Structured Logger
- Frontend Root Layout/Fonts
- Transitions Composition
- Shape Payload Schema
- Position Schema
- Frontend Pipeline Types
- Projects API Tests
- Video Upload Tests
- Remotion Docs Explorer Page
- Color List Schema
- Frontend API Entities
- Inline Celery Worker
- Caption Engine Dependencies
- Job Stage Routing
- Video Storage Client
- Transcript Validation Tests
- Transcript Endpoint Tests
- NPM Scripts
- Remotion MCP Config
- Video Rendering Dependencies
- Fake Progress Reporter
- Sequencing Composition UI
- Text Fit Utilities
- Celery Job Dispatcher
- Test Hub Page
- TypeScript Dev Dependencies
- Build Scripts
- Safe Area Schema
- Frame Rate Schema
- PostCSS Config

## God Nodes (most connected - your core abstractions)
1. `Project` - 72 edges
2. `Settings` - 64 edges
3. `PipelineStage` - 49 edges
4. `success_response()` - 47 edges
5. `StageExecutor` - 44 edges
6. `PipelineContext` - 43 edges
7. `Job` - 43 edges
8. `get_settings()` - 42 edges
9. `ProviderUsage` - 41 edges
10. `ProviderOutput` - 37 edges

## Surprising Connections (you probably didn't know these)
- `validate_transcript_business_rules()` --uses--> `TranscriptWord`  [INFERRED]
  apps/backend/app/ai/orchestration/validators.py → packages/contracts/python/pipeline.py
- `test_motion_script_schema_validation()` --calls--> `validate_motion_script()`  [EXTRACTED]
  apps/backend/tests/test_sprint3_motionscript.py → packages/contracts/python/validators.py
- `test_motion_script_validation_rules()` --calls--> `validate_motion_script()`  [EXTRACTED]
  apps/backend/tests/test_sprint3_motionscript.py → packages/contracts/python/validators.py
- `test_dummy_render_plan_applies_style()` --uses--> `CaptionPlan`  [INFERRED]
  apps/backend/tests/test_sprint5_styles.py → packages/contracts/python/pipeline.py
- `test_sentence_highlight_template()` --uses--> `CaptionPlan`  [INFERRED]
  apps/backend/tests/test_sprint5_styles.py → packages/contracts/python/pipeline.py

## Import Cycles
- None detected.

## Communities (146 total, 33 thin omitted)

### Community 0 - "Speech Provider Settings"
Cohesion: 0.05
Nodes (49): AsyncClient, Real (non-dummy) speech provider implementations. Source: Sprint 1.5/1.6 brief.…, register_groq_speech_provider(), _factory(), liveness(), AsyncSession, get, Health endpoints. Source: Sprint 1.3 brief > Build (Health endpoints).… (+41 more)

### Community 1 - "Project Management API"
Cohesion: 0.07
Nodes (62): get_owned_project(), Resolves a project the current profile owns. Source: database.md > RLS ("Every…, apply_fragment_overrides(), archive_project(), create_project(), CreateProjectRequest, CustomStyleRequest, delete_project() (+54 more)

### Community 2 - "Pipeline Structured Logging"
Cohesion: 0.06
Nodes (45): Any, Exception, Structured logging for the AI pipeline. Source: contracts/ai.md > Logging…, Emits one structured log record per pipeline event. Wraps…, StageLogger, PipelineOutcome, Any, AI Pipeline Orchestrator. Source: Sprint 1.4 brief > Build (AI Pipeline… (+37 more)

### Community 3 - "Worker Job Endpoints"
Cohesion: 0.10
Nodes (44): get_authenticated_worker_job(), _progress_reporter(), AsyncSession, HTTPAuthorizationCredentials, post, UploadFile, UUID, Internal callback endpoints a paired local worker uses to report job… (+36 more)

### Community 4 - "Draggable Caption Overlay UI"
Cohesion: 0.07
Nodes (58): CaptionRect, DraggableCaptionWrapper(), DraggableCaptionWrapperProps, InteractionMode, measureContentRect(), touchDistance(), SmoothCaptionOverlay(), BUNDLED_FAMILIES (+50 more)

### Community 5 - "Worker Pairing Endpoints"
Cohesion: 0.06
Nodes (51): _generate_code(), pair_start(), pair_status(), PairStartRequest, AsyncSession, BaseModel, get, post (+43 more)

### Community 6 - "AI Pipeline DI Container"
Cohesion: 0.07
Nodes (42): AIPipelineContainer, build_container(), Dependency injection container for the AI pipeline. Wires concrete service…, Holds the concrete service instances the orchestrator needs. Construct this…, Factory used by application startup code. Callers are responsible for…, PipelineOrchestrator, Runs Stages 1-5 in order for a single video, returning the final RenderPlan.…, AICompletionResult (+34 more)

### Community 7 - "AI Engine Assembly"
Cohesion: 0.07
Nodes (43): build_default_engine(), build_intelligence_only_engine(), build_stage_registry(), run_caption(), run_creative(), Engine assembly. Source: Sprint 1.4 brief > Providers ("Provider selection must…, Resolves providers by name from the typed registries (never hardcoded here —…, Sprint 2: engine restricted to SPEECH -> CREATIVE -> CAPTION stages (no… (+35 more)

### Community 8 - "API Bootstrap & Rate Limiting"
Cohesion: 0.06
Nodes (42): check_rate_limit(), Sliding-window rate limiter using Redis., RateLimitExceededError, configure_logging(), Export, contracts/database.md > exports — rendered videos., create_app(), FastAPI (+34 more)

### Community 9 - "Audio Extraction"
Cohesion: 0.08
Nodes (34): AudioExtractor, FfmpegAudioExtractor, ABC, Exception, Audio extraction for the speech provider. Source: Sprint 1.5 brief "Video ->…, Returns mono 16kHz WAV bytes extracted from `video_bytes`., Shells out to the `ffmpeg` binary already used elsewhere in this project…, UnsupportedMediaTypeError (+26 more)

### Community 10 - "Plan/Export Schemas"
Cohesion: 0.07
Nodes (41): CaptionPlanBase, CaptionPlanCreate, CaptionPlanRead, BaseModel, CreativePlanBase, CreativePlanCreate, CreativePlanRead, BaseModel (+33 more)

### Community 11 - "Creative Plan JSON Schema"
Cohesion: 0.04
Nodes (48): additionalProperties, type, description, type, minimum, type, items, type (+40 more)

### Community 12 - "Caption/Creative Providers"
Cohesion: 0.08
Nodes (27): Any, CreativePlan, Transcript, Any, Transcript, DummyCaptionProvider, CreativePlan, Transcript (+19 more)

### Community 13 - "Fake Test Service Doubles"
Cohesion: 0.05
Nodes (19): app(), _upload_service(), client(), fake_job_dispatcher(), fake_job_repository(), fake_progress_reporter(), fake_project_repository(), fake_storage_client() (+11 more)

### Community 14 - "App Error Handling"
Cohesion: 0.08
Nodes (39): AppError, CorruptedUploadError, Exception, FastAPI, Application error types and exception handlers. Source: ai-…, Base class for application errors with a stable code + HTTP status., register_exception_handlers(), handle_app_error() (+31 more)

### Community 15 - "Render Pipeline Stages"
Cohesion: 0.07
Nodes (21): get_export_repository(), build_render_stages(), stage_preparing(), stage_uploading(), Helper to run async coroutines synchronously in Celery worker thread., RenderPipelineContext, run_async(), FakeStorageClient (+13 more)

### Community 16 - "FastAPI Dependency Providers"
Cohesion: 0.07
Nodes (27): get_caption_plan_repository(), get_creative_plan_repository(), get_job_repository(), get_motion_script_repository(), get_owned_job(), get_progress_reporter(), get_project_repository(), get_transcript_repository() (+19 more)

### Community 17 - "Caption Plan JSON Schema"
Cohesion: 0.05
Nodes (41): additionalProperties, items, type, additionalProperties, properties, required, type, maximum (+33 more)

### Community 18 - "AI Orchestration Engine Tests"
Cohesion: 0.16
Nodes (21): AIPipelineOrchestrationEngine, InMemoryMetricsRecorder, Default recorder. Holds every metric for the process lifetime — fine for a…, StageExecutor, _ctx(), FixedUsageMixin, FlakySpeechProvider, AI orchestration engine tests. Source: Sprint 1.4 brief > Tests. Covers:… (+13 more)

### Community 19 - "API Entity Pydantic Models"
Cohesion: 0.12
Nodes (36): test_caption_plan_validation(), test_creative_plan_validation(), ApiError, Export, JobStatus, JobStatusValue, Project, BaseModel (+28 more)

### Community 20 - "Transcript JSON Schema"
Cohesion: 0.05
Nodes (38): additionalProperties, maximum, minimum, type, $defs, Word, description, minimum (+30 more)

### Community 21 - "Motion Studio Editor Pages"
Cohesion: 0.13
Nodes (27): MotionPage(), INITIAL_LAYERS, SequencingPage(), PRESENTATIONS, TIMINGS, TransitionsPage(), CASINGS, COLOR_MODES (+19 more)

### Community 22 - "Dummy Render Plan Logic"
Cohesion: 0.09
Nodes (29): analyze_text_features(), _clean_transcript_word(), estimate_text_width(), get_segment_word_timings(), group_words(), is_abbreviation(), is_capitalized(), is_month() (+21 more)

### Community 23 - "Landing Page Sections"
Cohesion: 0.13
Nodes (21): LandingPage(), CaptionPhone(), Closing(), Contrast(), LINE, Control(), CONTROLS, Hero() (+13 more)

### Community 24 - "Dashboard & Settings Pages"
Cohesion: 0.13
Nodes (21): nextConfig, DashboardPage(), STATUS_CHIP, timeAgo(), ConnectedComputerSection(), INSTALL_COMMANDS, SettingsPage(), PairConfirmContent() (+13 more)

### Community 25 - "Render Plan Style Tests"
Cohesion: 0.23
Nodes (23): DummyRenderPlanProvider, asyncio, test_dummy_render_plan_applies_style(), test_patch_project_style_endpoint(), test_sentence_highlight_template(), test_staggered_3line_template(), asyncio, test_quality_render_plan_computes_metrics_and_hooks() (+15 more)

### Community 26 - "MotionScript Schema (Python)"
Cohesion: 0.14
Nodes (25): enum, MotionScript, BaseModel, MotionScript schema definition for Sprint 3. MotionScript is the single,…, AudioEffectPayload, CameraPayload, Canvas, CaptionPayload (+17 more)

### Community 27 - "Video JSON Schema"
Cohesion: 0.07
Nodes (27): additionalProperties, type, description, minimum, type, exclusiveMinimum, type, minimum (+19 more)

### Community 28 - "Caption Payload Schema"
Cohesion: 0.08
Nodes (27): type, additionalProperties, properties, required, type, type, CaptionPayload, HighlightPayload (+19 more)

### Community 29 - "Worker Job Pipeline Runner"
Cohesion: 0.13
Nodes (12): Job pipeline runner. Source: Sprint 1.3 brief > Worker, Reliability. Pure…, Runs `stages` in order, reporting progress after each. Returns a terminal…, run_job_pipeline(), _run_stages(), DeadLetterSinkProtocol, JobLockProtocol, JobOutcome, JobRepositoryProtocol (+4 more)

### Community 30 - "Export JSON Schema"
Cohesion: 0.08
Nodes (25): additionalProperties, description, type, minimum, type, $id, format, type (+17 more)

### Community 31 - "Job Status JSON Schema"
Cohesion: 0.08
Nodes (25): additionalProperties, description, oneOf, minimum, type, $id, format, type (+17 more)

### Community 32 - "Frontend Lint/Package Config"
Cohesion: 0.08
Nodes (22): eslintConfig, react, name, private, version, clsx, eslint, eslint-config-next (+14 more)

### Community 33 - "Project JSON Schema"
Cohesion: 0.08
Nodes (24): additionalProperties, format, type, description, $id, format, type, properties (+16 more)

### Community 34 - "Prompt Loading & Dead Letter"
Cohesion: 0.11
Nodes (12): load_prompt(), Loads a prompt template from the root prompts directory. Supports versioning by…, Redis, Dead-letter sink. Source: Sprint 1.3 brief > Reliability ("Dead-letter failed…, RedisDeadLetterSink, FakeCaptionPlanRepository, FakeCreativePlanRepository, asyncio (+4 more)

### Community 35 - "ASS Subtitle Rendering"
Cohesion: 0.14
Nodes (12): estimate_text_width(), MotionScript, Uses ffprobe to extract video metadata., Centered crop-to-ratio matching the studio preview's own crop (the video…, Executes the pipeline stages to render a video with subtitles., Converts milliseconds to ASS timestamp format (H:MM:SS.cs)., Converts hex color (e.g. #FFFFFF or #FF0000) to ASS format (&HAAABBGR)., Blends a hex color toward white by `amount` (0..1). (+4 more)

### Community 36 - "Sidebar Template Controls UI"
Cohesion: 0.11
Nodes (17): BUILTIN_TEMPLATE_PRESETS, POPULAR_FONTS, SidebarControlsSectionProps, TEMPLATE_LOCK_HINTS, TRENDING_PRESET_IDS, TRENDING_TEMPLATE_PRESETS, outlineShadow(), Props (+9 more)

### Community 37 - "Render Plan JSON Schema"
Cohesion: 0.09
Nodes (22): additionalProperties, items, type, description, $ref, $ref, $id, $ref (+14 more)

### Community 38 - "Landing Page Fonts/Scenes"
Cohesion: 0.15
Nodes (18): HERO_CYCLE, SceneConfig, ScenePreset, SCENES, anton, baloo, caveat, cinzel (+10 more)

### Community 39 - "Motion Composition Animations"
Cohesion: 0.14
Nodes (15): Cursor(), getTypedText(), MyAnimation(), EASINGS, EXTRAPOLATES, MODES, EasingPreset, ExtrapolateMode (+7 more)

### Community 40 - "Render Plan TS Types"
Cohesion: 0.10
Nodes (20): Animation, AudioEffectPayload, CameraPayload, Canvas, CaptionPayload, EmojiPayload, EventType, ExportSettings (+12 more)

### Community 41 - "Local Worker Pairing Tool"
Cohesion: 0.13
Nodes (18): _find_or_download_cloudflared(), main(), _pick_free_port(), Runs the local worker + a Cloudflare Quick Tunnel and pairs it with the…, The Render free-tier backend sleeps after ~15min idle and takes 30-60s+ to wake…, _wake_backend(), get_local_worker_settings(), LocalWorkerSettings (+10 more)

### Community 42 - "Frontend Dependencies"
Cohesion: 0.10
Nodes (20): dependencies, clsx, framer-motion, gsap, @gsap/react, lenis, lucide-react, @motion-ai/caption-engine (+12 more)

### Community 43 - "Caption Engine Package Config"
Cohesion: 0.11
Nodes (18): @motion-ai/caption-engine, react-dom, @types/react-dom, react, main, name, private, scripts (+10 more)

### Community 44 - "Auth Pages (Login/Reset)"
Cohesion: 0.32
Nodes (15): ForgotPasswordPage(), GoogleMark(), LoginPage(), Mode, ResetPasswordPage(), AuthShell(), CaptionReel(), ErrorNote() (+7 more)

### Community 45 - "API Error JSON Schema"
Cohesion: 0.10
Nodes (19): additionalProperties, type, description, type, $id, type, properties, code (+11 more)

### Community 46 - "Speech-Only Engine Build"
Cohesion: 0.15
Nodes (8): build_speech_only_engine(), run_speech(), Sprint 1.6: engine restricted to SPEECH_RECOGNITION + TRANSCRIPT_VALIDATION.…, KeyError, Returns registered stages in pipeline order. A partially built registry (e.g.…, StageNotRegisteredError, StageRegistry, StageDefinition

### Community 47 - "Workspace Export/Header UI"
Cohesion: 0.17
Nodes (13): AI_PIPELINE_STAGES, ConnectComputerCta(), ExportHistorySection(), ExportHistorySectionProps, isNoWorkerError(), RENDER_PIPELINE_STAGES, TRANSCRIPTION_LANGUAGES, WorkspaceHeaderProps (+5 more)

### Community 48 - "Frontend API Client"
Cohesion: 0.16
Nodes (10): apiClient, ApiError, ApiErrorBody, fetchWithNetworkErrorHandling(), NetworkUnavailableError, unwrap(), TranscriptResponse, TranscriptWord (+2 more)

### Community 49 - "Frontend TS Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 50 - "Render Metadata Schema"
Cohesion: 0.11
Nodes (19): Metadata, format, type, type, additionalProperties, properties, required, type (+11 more)

### Community 51 - "User JSON Schema"
Cohesion: 0.11
Nodes (18): additionalProperties, type, description, format, type, $id, format, type (+10 more)

### Community 52 - "Project Workspace Editor UI"
Cohesion: 0.20
Nodes (14): describeError(), ensureFontLoaded(), ProjectWorkspacePage(), SidebarControlsSection(), AMBER_CONFIDENCE_THRESHOLD, isUnverified(), MIN_WORD_DURATION_MS, TimelineEditorSection() (+6 more)

### Community 53 - "Supabase Auth Provider"
Cohesion: 0.15
Nodes (3): projectRef, AuthProvider, User

### Community 54 - "Frontend Projects Service"
Cohesion: 0.12
Nodes (12): BackendProject, ProjectPage, projectsService, CaptionPlan, CaptionSegment, Export, Job, JobStatus (+4 more)

### Community 55 - "Worker Job Execution"
Cohesion: 0.22
Nodes (15): _auth_headers(), _post_progress(), AsyncClient, Executes one job (the full AI pipeline, or a render) on this machine and…, _report_failed(), _run_ai_pipeline(), _on_stage_complete(), run_job() (+7 more)

### Community 56 - "Caption Engine Dependencies"
Cohesion: 0.12
Nodes (16): @types/react, typescript, devDependencies, react, remotion, @types/react, typescript, react (+8 more)

### Community 57 - "UI Component Library"
Cohesion: 0.24
Nodes (11): Button(), ButtonProps, Card(), CardProps, Input(), InputProps, Spinner(), Timeline() (+3 more)

### Community 58 - "Export Settings Schema"
Cohesion: 0.12
Nodes (17): type, type, type, type, ExportSettings, additionalProperties, properties, required (+9 more)

### Community 59 - "Style Preset Manager"
Cohesion: 0.23
Nodes (11): AnimationPreset, EmojiPreset, HighlightPreset, BaseModel, Hydrates one preset into the in-process cache from a source other than…, SafeAreaPreset, StylePreset, StylePresetManager (+3 more)

### Community 60 - "Timeline Event Schema"
Cohesion: 0.12
Nodes (16): TimelineEvent, minimum, type, $ref, description, type, end_ms, layer (+8 more)

### Community 61 - "Supabase JWT Verification"
Cohesion: 0.22
Nodes (13): decode_supabase_jwt(), InvalidTokenError, _jwks_client(), Exception, Supabase JWT verification. Source: contracts/api.md ("JWT Protected") Decodes…, Returns the decoded claims. `sub` is the Supabase auth.users.id (uuid)., fixture, settings() (+5 more)

### Community 62 - "Frontend Upload Service"
Cohesion: 0.17
Nodes (7): FakeXHR, ALLOWED_TYPES, UploadResponse, uploadService, UploadStatusResponse, UploadValidationError, validateFile()

### Community 63 - "Project Style Schema"
Cohesion: 0.13
Nodes (15): type, $ref, type, type, properties, type, aspect_ratio, canvas (+7 more)

### Community 64 - "Frontend Dev Dependencies"
Cohesion: 0.14
Nodes (14): devDependencies, eslint, eslint-config-next, jsdom, tailwindcss, @tailwindcss/postcss, @testing-library/jest-dom, @testing-library/react (+6 more)

### Community 65 - "Render Plan Enums Schema"
Cohesion: 0.14
Nodes (14): enum, type, $defs, Animation, EventType, GlobalSettings, Layer, enum (+6 more)

### Community 66 - "Audio Effect Schema"
Cohesion: 0.14
Nodes (14): additionalProperties, description, properties, required, type, AudioEffectPayload, type, minimum (+6 more)

### Community 67 - "Transition Payload Schema"
Cohesion: 0.14
Nodes (14): TransitionPayload, exclusiveMinimum, type, type, duration, easing, type, additionalProperties (+6 more)

### Community 69 - "Dummy Worker Pipeline Stages"
Cohesion: 0.21
Nodes (10): build_dummy_stages(), Dummy pipeline stages. Source: Sprint 1.3 brief > Worker. "Do not process AI.…, Builds the dummy metadata-extraction pipeline. `stage_duration_seconds`…, _sleep(), Stage, fixture, Worker pipeline tests. Source: Sprint 1.3 brief > Tests. Calls…, _reset_lock_state() (+2 more)

### Community 70 - "MotionScript Endpoint Tests"
Cohesion: 0.23
Nodes (8): FakeMotionScriptRepository, MockMotionScriptRow, asyncio, test_get_motion_script_endpoint_404(), test_get_motion_script_endpoint_success(), test_motion_script_schema_validation(), test_motion_script_validation_rules(), test_repository_operations()

### Community 71 - "Worker Retry/Lifecycle Tests"
Cohesion: 0.22
Nodes (5): FakeDeadLetterSink, _run(), _stages(), TestRetryLogic, TestWorkerLifecycle

### Community 72 - "Camera Payload Schema"
Cohesion: 0.15
Nodes (13): type, additionalProperties, minProperties, properties, type, CameraPayload, type, blur (+5 more)

### Community 73 - "Margin/Box Schema"
Cohesion: 0.15
Nodes (13): minimum, type, minimum, type, bottom, left, right, top (+5 more)

### Community 74 - "Remotion Chart Animations"
Cohesion: 0.24
Nodes (10): Bar(), {fontFamily}, MyAnimation(), Title(), XAxis(), YAxis(), {fontFamily}, Highlight() (+2 more)

### Community 75 - "AI Pipeline Stage Tests"
Cohesion: 0.24
Nodes (8): build_ai_pipeline_stages(), _on_stage_complete(), _run_ai_pipeline(), Session, FakeSession, Source: Sprint 1.6 brief > Processing — worker wiring of the existing Sprint…, test_speech_analysis_stage_persists_a_transcript_using_dummy_provider(), test_speech_analysis_stage_raises_when_no_video_exists()

### Community 77 - "Fake Worker Job Repository"
Cohesion: 0.18
Nodes (3): Minimal job projection the pipeline runner needs — decoupled from the…, WorkerJobView, FakeWorkerJobRepository

### Community 78 - "Remotion Pipeline TS Config"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, jsx, lib, module, moduleResolution, skipLibCheck (+3 more)

### Community 79 - "Caption Engine TS Config"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit, skipLibCheck (+3 more)

### Community 80 - "Emoji Payload Schema"
Cohesion: 0.17
Nodes (12): $ref, EmojiPayload, type, additionalProperties, properties, required, type, animation (+4 more)

### Community 81 - "Transcript Repository"
Cohesion: 0.29
Nodes (6): contracts/database.md > transcripts — speech-to-text output. Structured JSON…, Transcript, AsyncSession, UUID, Transcript repository. Source: contracts/database.md > transcripts Sprint 1.5…, TranscriptRepository

### Community 82 - "Render Engine Font/Text Utils"
Cohesion: 0.24
Nodes (9): is_capitalized(), is_number(), map_font_family(), normalize_word(), pick_keyword_idx(), Fallback only — the render-plan stage already picked the keyword word (honoring…, resolve_box_margins(), re (+1 more)

### Community 83 - "Worker Job Locking Tests"
Cohesion: 0.20
Nodes (5): FakeJobLock, Two real threads race to acquire the same job's lock at the same time. Exactly…, Shared across "workers" via a class-level dict + lock to simulate concurrent…, TestJobLocking, worker()

### Community 84 - "Frontend Motion Script Tests"
Cohesion: 0.18
Nodes (4): motionScriptService, transcriptService, ref_path, vitest

### Community 85 - "Asset Schema"
Cohesion: 0.18
Nodes (11): additionalProperties, properties, required, type, Asset, type, type, id (+3 more)

### Community 86 - "Canvas Size Schema"
Cohesion: 0.18
Nodes (11): additionalProperties, properties, required, type, Canvas, minimum, type, height (+3 more)

### Community 88 - "Celery App & Worker Logging"
Cohesion: 0.20
Nodes (8): _on_worker_shutting_down(), Celery application. Source: Sprint 1.3 brief > Build (Celery, Redis).…, Graceful shutdown hook. Source: Sprint 1.3 brief > Reliability.…, Structured job logging. Source: Sprint 1.3 brief > Logging. "Every job records:…, celery, celery_signals, connect, ssl

### Community 89 - "Typography Composition & Fonts"
Cohesion: 0.27
Nodes (8): applyCasing(), TypographyComposition(), TypographyCompositionProps, ensureProductionFontsLoaded(), FONT_PRODUCTION_USAGE, PRODUCTION_FONT_FAMILIES, PRODUCTION_FONTS, ProductionFontDef

### Community 90 - "Pipeline Metrics Recorder"
Cohesion: 0.22
Nodes (4): MetricsRecorder, Protocol, StageMetric, RepairFn

### Community 91 - "Provider Registry"
Cohesion: 0.25
Nodes (4): ProviderNotRegisteredError, KeyError, TypedProviderRegistry, P

### Community 92 - "Caption Plan Repository"
Cohesion: 0.36
Nodes (5): CaptionPlan, contracts/database.md > caption_plans — caption segmentation. Contains…, CaptionPlanRepository, AsyncSession, UUID

### Community 93 - "Motion Script Repository"
Cohesion: 0.36
Nodes (5): MotionScript, contracts/database.md > motion_scripts — primary AI output. Contains…, MotionScriptRepository, AsyncSession, UUID

### Community 95 - "Frontend Root Layout/Fonts"
Cohesion: 0.25
Nodes (8): apps_frontend_src_app_globals, fraunces, jetbrainsMono, metadata, montserrat, RootLayout(), sora, QueryProvider()

### Community 96 - "Transitions Composition"
Cohesion: 0.28
Nodes (8): Card(), CARDS, PresentationName, resolvePresentation(), TimingName, TransitionsComposition(), TransitionsCompositionProps, @remotion/transitions

### Community 97 - "Shape Payload Schema"
Cohesion: 0.22
Nodes (9): ShapePayload, shape, enum, type, additionalProperties, description, properties, required (+1 more)

### Community 98 - "Position Schema"
Cohesion: 0.22
Nodes (9): additionalProperties, properties, required, type, position, x, y, type (+1 more)

### Community 99 - "Frontend Pipeline Types"
Cohesion: 0.22
Nodes (8): CaptionPlan, CaptionSegment, CaptionStyle, CreativePlan, EnergyCurvePoint, KeyMoment, Transcript, TranscriptWord

### Community 100 - "Projects API Tests"
Cohesion: 0.39
Nodes (7): asyncio, Source: contracts/api.md > Projects, AI Processing — Sprint 1.6. Covers the…, test_delete_project_soft_deletes(), test_list_projects_returns_only_current_owners_non_deleted_projects(), test_patch_project_renames(), test_process_project_with_video_queues_and_dispatches_ai_pipeline_job(), test_process_project_without_video_returns_404()

### Community 101 - "Video Upload Tests"
Cohesion: 0.43
Nodes (7): _create_project(), test_upload_rejects_corrupted_file(), test_upload_rejects_oversized_file(), test_upload_rejects_unsupported_format(), test_upload_status_after_upload(), test_upload_to_unowned_project_is_forbidden(), test_upload_video_success()

### Community 102 - "Remotion Docs Explorer Page"
Cohesion: 0.32
Nodes (7): ALL_FONTS, ANIMATIONS_LIST, ensureFontLoaded(), FONT_CATEGORIES, getFontCategoryTag(), RemotionDocumentationExplorer(), STYLE_PRESETS

### Community 103 - "Color List Schema"
Cohesion: 0.25
Nodes (8): items, type, items, type, minimum, type, default_colors, indices

### Community 104 - "Frontend API Entities"
Cohesion: 0.25
Nodes (7): ApiError, Export, JobStatus, JobStatusValue, Project, User, Video

### Community 105 - "Inline Celery Worker"
Cohesion: 0.33
Nodes (6): _startup_inline_worker(), Runs the Celery worker loop in this same process. Only used when…, Portable stand-in for `celery beat` — periodically dispatches this project's…, _start_inline_beat(), _start_inline_worker(), _run()

### Community 106 - "Caption Engine Dependencies"
Cohesion: 0.29
Nodes (7): dependencies, @motion-ai/caption-engine, react, react-dom, remotion, @remotion/cli, @remotion/renderer

### Community 107 - "Job Stage Routing"
Cohesion: 0.33
Nodes (6): _build_stages(), run_metadata_extraction(), Raised when a job can't be matched to a real stage list. There used to be a…, Selects the stage list by the job's `job_type`., UnroutableJobError, RuntimeError

### Community 110 - "Transcript Endpoint Tests"
Cohesion: 0.47
Nodes (5): asyncio, Source: contracts/api.md > GET /projects/{id}/transcript — Sprint 1.6., test_get_transcript_404_when_none_persisted_yet(), test_get_transcript_returns_latest_persisted_transcript(), test_update_transcript_success()

### Community 111 - "NPM Scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, lint, start, test

### Community 112 - "Remotion MCP Config"
Cohesion: 0.33
Nodes (5): npx, remotion-documentation, render, supabase, @remotion/mcp

### Community 113 - "Video Rendering Dependencies"
Cohesion: 0.33
Nodes (6): dependencies, remotion, @remotion/cli, @remotion/player, @remotion/renderer, wavesurfer.js

### Community 115 - "Sequencing Composition UI"
Cohesion: 0.50
Nodes (4): LayerCard(), SequenceLayer, SequencingComposition(), SequencingCompositionProps

### Community 119 - "TypeScript Dev Dependencies"
Cohesion: 0.50
Nodes (4): devDependencies, @types/react, @types/react-dom, typescript

### Community 120 - "Build Scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, start

### Community 121 - "Safe Area Schema"
Cohesion: 0.50
Nodes (4): safe_area, additionalProperties, required, type

### Community 125 - "Frame Rate Schema"
Cohesion: 0.67
Nodes (3): exclusiveMinimum, type, frame_rate

## Knowledge Gaps
- **605 isolated node(s):** `ApiError`, `Export`, `JobStatus`, `JobStatusValue`, `Project` (+600 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1180 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Project` connect `Project Management API` to `Speech Provider Settings`, `Worker Job Endpoints`, `Worker Pairing Endpoints`, `Video Upload Tests`, `API Bootstrap & Rate Limiting`, `AI Pipeline Stage Tests`, `Fake Test Service Doubles`, `Render Pipeline Stages`, `FastAPI Dependency Providers`, `Dummy Render Plan Logic`, `Render Plan Style Tests`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `Settings` connect `Speech Provider Settings` to `Prompt Loading & Dead Letter`, `Worker Job Endpoints`, `Worker Pairing Endpoints`, `AI Engine Assembly`, `API Bootstrap & Rate Limiting`, `Audio Extraction`, `AI Pipeline Stage Tests`, `App Error Handling`, `Render Pipeline Stages`, `FastAPI Dependency Providers`, `Supabase JWT Verification`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `PipelineContext` connect `Pipeline Structured Logging` to `Prompt Loading & Dead Letter`, `Worker Job Endpoints`, `AI Pipeline DI Container`, `AI Engine Assembly`, `Audio Extraction`, `AI Pipeline Stage Tests`, `Caption/Creative Providers`, `Speech-Only Engine Build`, `AI Orchestration Engine Tests`, `Worker Job Execution`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Are the 33 inferred relationships involving `Project` (e.g. with `DummyRenderPlanProvider` and `get_owned_project()`) actually correct?**
  _`Project` has 33 INFERRED edges - model-reasoned connections that need verification._
- **Are the 31 inferred relationships involving `Settings` (e.g. with `GroqCaptionProvider` and `register_groq_caption_provider()`) actually correct?**
  _`Settings` has 31 INFERRED edges - model-reasoned connections that need verification._
- **Are the 21 inferred relationships involving `PipelineStage` (e.g. with `StageLogger` and `PipelineOutcome`) actually correct?**
  _`PipelineStage` has 21 INFERRED edges - model-reasoned connections that need verification._
- **What connects `ApiError`, `Export`, `JobStatus` to the rest of the system?**
  _605 weakly-connected nodes found - possible documentation gaps or missing edges._
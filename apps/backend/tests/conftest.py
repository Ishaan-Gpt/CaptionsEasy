import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import pytest

# app.ai.* imports `packages.contracts.python` (the monorepo's shared
# contracts package, living at the repo root — see e.g.
# app/ai/services/base.py's TODO about real workspace packaging). Make the
# repo root importable so that resolves under pytest.
_REPO_ROOT = Path(__file__).resolve().parents[3]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

# Settings are required env vars — set test values before any app module
# (which calls get_settings() at import time) is imported.
os.environ.setdefault("DATABASE_URL_ASYNC", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg2://test:test@localhost/test")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-secret")
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")

import httpx  # noqa: E402

from app.db.enums import JobStatus  # noqa: E402
from app.db.models.job import Job  # noqa: E402
from app.db.models.profile import Profile  # noqa: E402
from app.db.models.project import Project  # noqa: E402
from app.db.models.video import Video  # noqa: E402


def _now() -> datetime:
    """Fakes don't touch a real DB, so server_default=func.now() never
    fires — fixtures must set created_at/updated_at themselves to match
    what a persisted row would actually look like."""
    return datetime.now(timezone.utc)


class FakeStorageClient:
    def __init__(self) -> None:
        self.uploads: list[dict] = []
        self.files: dict[str, bytes] = {}

    async def upload(self, *, path: str, content: bytes, content_type: str) -> str:
        self.uploads.append({"path": path, "size": len(content), "content_type": content_type})
        self.files[path] = content
        return path

    async def download(self, *, path: str) -> bytes:
        return self.files[path]

    async def get_signed_url(self, *, path: str, expires_in: int = 3600) -> str:
        return f"https://mock-supabase.co/storage/v1/object/sign/{path}?token=mock"



class FakeProjectRepository:
    def __init__(self) -> None:
        self.projects: dict[uuid.UUID, Project] = {}

    async def create(self, *, owner_id, title, description=None):
        now = _now()
        project = Project(
            id=uuid.uuid4(),
            owner_id=owner_id,
            title=title,
            description=description,
            created_at=now,
            updated_at=now,
        )
        self.projects[project.id] = project
        return project

    async def get_by_id(self, project_id):
        return self.projects.get(project_id)

    async def get_owned_by(self, project_id, owner_id):
        project = self.projects.get(project_id)
        if project and project.owner_id == owner_id:
            return project
        return None

    async def update_status(self, project, status):
        project.status = status
        return project

    async def get_all_by_owner(self, owner_id, *, limit=50, offset=0):
        matches = [
            p for p in self.projects.values() if p.owner_id == owner_id and p.deleted_at is None
        ]
        matches.sort(key=lambda p: p.created_at, reverse=True)
        return matches[offset : offset + limit], len(matches)

    async def update_fields(self, project, *, title=None, description=None, status=None, thumbnail_url=None):
        if title is not None:
            project.title = title
        if description is not None:
            project.description = description
        if status is not None:
            project.status = status
        if thumbnail_url is not None:
            project.thumbnail_url = thumbnail_url
        return project

    async def soft_delete(self, project):
        project.deleted_at = _now()
        return project


class FakeVideoRepository:
    def __init__(self) -> None:
        self.videos: list[Video] = []

    async def create(self, *, project_id, storage_path, file_size):
        now = _now()
        video = Video(
            id=uuid.uuid4(),
            project_id=project_id,
            storage_path=storage_path,
            file_size=file_size,
            created_at=now,
            updated_at=now,
        )
        self.videos.append(video)
        return video

    async def get_latest_for_project(self, project_id):
        matches = [v for v in self.videos if v.project_id == project_id]
        return matches[-1] if matches else None


class FakeProgressReporter:
    def __init__(self) -> None:
        self._store: dict[str, dict] = {}

    def set_progress(self, job_id, *, stage, percentage, estimated_remaining_ms):
        self._store[job_id] = {
            "stage": stage,
            "percentage": percentage,
            "estimated_remaining_ms": estimated_remaining_ms,
        }

    def clear(self, job_id):
        self._store.pop(job_id, None)

    def get_progress(self, job_id):
        return self._store.get(job_id)


class FakeJobDispatcher:
    def __init__(self) -> None:
        self.dispatched_job_ids: list[str] = []

    def dispatch(self, job_id: str) -> None:
        self.dispatched_job_ids.append(job_id)


class FakeJobRepository:
    def __init__(self) -> None:
        self.jobs: list[Job] = []

    async def create_queued(self, *, project_id, job_type):
        now = _now()
        job = Job(
            id=uuid.uuid4(),
            project_id=project_id,
            job_type=job_type,
            status=JobStatus.QUEUED,
            progress=0,
            created_at=now,
            updated_at=now,
        )
        self.jobs.append(job)
        return job

    async def get_by_id(self, job_id):
        return next((j for j in self.jobs if j.id == job_id), None)

    async def get_latest_for_project(self, project_id, *, job_type):
        matches = [j for j in self.jobs if j.project_id == project_id and j.job_type == job_type]
        return matches[-1] if matches else None


class FakeTranscriptRepository:
    def __init__(self) -> None:
        self.transcripts: list = []

    async def get_latest_for_project(self, project_id):
        matches = [t for t in self.transcripts if t.project_id == project_id]
        return matches[-1] if matches else None

    async def create(self, *, project_id, language, provider, version, transcript_json):
        from app.db.models.transcript import Transcript

        transcript = Transcript(
            id=uuid.uuid4(),
            project_id=project_id,
            language=language,
            provider=provider,
            version=version,
            transcript_json=transcript_json,
            created_at=_now(),
            updated_at=_now(),
        )
        self.transcripts.append(transcript)
        return transcript


@pytest.fixture
def fake_profile() -> Profile:
    now = _now()
    return Profile(
        id=uuid.uuid4(),
        auth_user_id=uuid.uuid4(),
        full_name="Test User",
        created_at=now,
        updated_at=now,
    )


@pytest.fixture
def fake_project_repository() -> FakeProjectRepository:
    return FakeProjectRepository()


@pytest.fixture
def fake_video_repository() -> FakeVideoRepository:
    return FakeVideoRepository()


@pytest.fixture
def fake_job_repository() -> FakeJobRepository:
    return FakeJobRepository()


@pytest.fixture
def fake_storage_client() -> FakeStorageClient:
    return FakeStorageClient()


@pytest.fixture
def fake_job_dispatcher() -> FakeJobDispatcher:
    return FakeJobDispatcher()


@pytest.fixture
def fake_progress_reporter() -> FakeProgressReporter:
    return FakeProgressReporter()


@pytest.fixture
def fake_transcript_repository() -> FakeTranscriptRepository:
    return FakeTranscriptRepository()


@pytest.fixture
def app(
    fake_profile,
    fake_project_repository,
    fake_video_repository,
    fake_job_repository,
    fake_storage_client,
    fake_job_dispatcher,
    fake_progress_reporter,
    fake_transcript_repository,
):
    from app.api.v1 import deps as v1_deps
    from app.api.v1.upload import get_upload_service
    from app.auth.dependencies import get_current_profile
    from app.main import create_app
    from app.services.upload_service import UploadService

    fastapi_app = create_app()

    fastapi_app.dependency_overrides[get_current_profile] = lambda: fake_profile
    fastapi_app.dependency_overrides[v1_deps.get_project_repository] = lambda: fake_project_repository
    fastapi_app.dependency_overrides[v1_deps.get_video_repository] = lambda: fake_video_repository
    fastapi_app.dependency_overrides[v1_deps.get_job_repository] = lambda: fake_job_repository
    fastapi_app.dependency_overrides[v1_deps.get_job_dispatcher] = lambda: fake_job_dispatcher
    fastapi_app.dependency_overrides[v1_deps.get_progress_reporter] = lambda: fake_progress_reporter
    fastapi_app.dependency_overrides[v1_deps.get_transcript_repository] = lambda: fake_transcript_repository

    def _upload_service():
        from app.core.config import get_settings

        return UploadService(
            storage_client=fake_storage_client,
            video_repository=fake_video_repository,
            job_repository=fake_job_repository,
            settings=get_settings(),
        )

    fastapi_app.dependency_overrides[get_upload_service] = _upload_service

    return fastapi_app


@pytest.fixture
def client(app):
    transport = httpx.ASGITransport(app=app)
    return httpx.AsyncClient(transport=transport, base_url="http://test")

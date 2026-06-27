import os
import uuid

import pytest

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


class FakeStorageClient:
    def __init__(self) -> None:
        self.uploads: list[dict] = []

    async def upload(self, *, path: str, content: bytes, content_type: str) -> str:
        self.uploads.append({"path": path, "size": len(content), "content_type": content_type})
        return path


class FakeProjectRepository:
    def __init__(self) -> None:
        self.projects: dict[uuid.UUID, Project] = {}

    async def create(self, *, owner_id, title, description=None):
        project = Project(id=uuid.uuid4(), owner_id=owner_id, title=title, description=description)
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


class FakeVideoRepository:
    def __init__(self) -> None:
        self.videos: list[Video] = []

    async def create(self, *, project_id, storage_path, file_size):
        video = Video(id=uuid.uuid4(), project_id=project_id, storage_path=storage_path, file_size=file_size)
        self.videos.append(video)
        return video


class FakeJobRepository:
    def __init__(self) -> None:
        self.jobs: list[Job] = []

    async def create_queued(self, *, project_id, job_type):
        job = Job(id=uuid.uuid4(), project_id=project_id, job_type=job_type, status=JobStatus.QUEUED, progress=0)
        self.jobs.append(job)
        return job

    async def get_by_id(self, job_id):
        return next((j for j in self.jobs if j.id == job_id), None)

    async def get_latest_for_project(self, project_id, *, job_type):
        matches = [j for j in self.jobs if j.project_id == project_id and j.job_type == job_type]
        return matches[-1] if matches else None


@pytest.fixture
def fake_profile() -> Profile:
    return Profile(id=uuid.uuid4(), auth_user_id=uuid.uuid4(), full_name="Test User")


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
def app(fake_profile, fake_project_repository, fake_video_repository, fake_job_repository, fake_storage_client):
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

import uuid
import pytest
from pydantic import ValidationError
from packages.contracts.python import (
    MotionScript,
    validate_motion_script,
)
from app.render.engine import RenderEngine
from app.worker.render_stage import build_render_stages, RenderPipelineContext

MOCK_MOTION_SCRIPT_DATA = {
    "version": "1.0",
    "metadata": {
        "version": "1.0",
        "project_id": "p-1",
        "video_id": "v-1",
        "generated_at": "2026-06-27T12:00:00Z",
        "generator_version": "test-v1",
    },
    "assets": [],
    "global_settings": {
        "canvas": {"width": 1080, "height": 1920},
        "frame_rate": 30.0,
        "resolution": "1080x1920",
        "aspect_ratio": "9:16",
        "safe_area": {"top": 80, "bottom": 80, "left": 40, "right": 40},
        "theme": "dark",
        "default_font": "Inter",
        "default_colors": ["#FFFFFF"],
        "motion_preset": "minimal",
    },
    "timeline": [
        {
            "id": "evt-1",
            "start_ms": 0,
            "end_ms": 1000,
            "layer": "captions",
            "type": "caption",
            "payload": {
                "text": "Hello world",
                "font": "Inter",
                "size": 48.0,
                "weight": "700",
                "color": "#FFFFFF",
                "alignment": "center",
                "animation": "fade",
            },
        }
    ],
}


def test_ass_generation():
    engine = RenderEngine()
    script = validate_motion_script(MOCK_MOTION_SCRIPT_DATA)
    ass_content = engine.generate_ass(script)
    
    assert "[Script Info]" in ass_content
    assert "PlayResX: 1080" in ass_content
    assert "PlayResY: 1920" in ass_content
    assert "Default,Inter,48" in ass_content
    assert "[Events]" in ass_content
    # MarginL/MarginR are now the preset's real safe_area (40/40 for
    # "minimal", the fallback this mock's "dark" theme resolves to), not
    # hardcoded 0 — Phase C's per-caption box override reuses this same
    # Dialogue-level margin column, so the no-override case had to start
    # actually reflecting the project's global safe_area instead of ignoring
    # it entirely.
    assert "Dialogue: 0,0:00:00.00,0:00:01.00,Default,,40,40,0,,{\\fad(150,150)}Hello world" in ass_content


def test_ass_generation_with_animations():
    engine = RenderEngine()
    data = dict(MOCK_MOTION_SCRIPT_DATA)
    data["timeline"] = [
        {
            "id": "evt-1",
            "start_ms": 0,
            "end_ms": 1000,
            "layer": "captions",
            "type": "caption",
            "payload": {
                "text": "Subtitles",
                "font": "Outfit",
                "size": 60.0,
                "weight": "800",
                "color": "#FF0000",
                "alignment": "left",
                "animation": "scale",
            },
        }
    ]
    script = validate_motion_script(data)
    ass_content = engine.generate_ass(script)
    assert "Default,Outfit,60" in ass_content
    assert "Dialogue: 0,0:00:00.00,0:00:01.00,Default,,40,40,0,,{\\fscx0\\fscy0}{\\t(0,150,\\fscx100\\fscy100)}Subtitles" in ass_content


class FakeSession:
    def __init__(self):
        self.added = []
        self.commits = 0

    def execute(self, query):
        class MockResult:
            def scalar_one_or_none(self):
                return None
            def scalars(self):
                class MockScalars:
                    def first(self):
                        return None
                return MockScalars()
        return MockResult()

    def add(self, obj):
        self.added.append(obj)

    def commit(self):
        self.commits += 1


def test_render_stages_pipeline():
    from app.core.config import get_settings
    session = FakeSession()
    settings = get_settings()
    
    stages = build_render_stages(session, "job-1", settings)
    
    # Assert all 5 progress stages are returned
    assert len(stages) == 5
    assert [s.name for s in stages] == [
        "Preparing",
        "Generating ASS",
        "Rendering",
        "Encoding",
        "Uploading",
    ]


class MockExportRow:
    def __init__(self, **kwargs):
        self.file_size = None
        self.style = None
        self.duration_ms = None
        self.status = None
        self.created_at = None
        for k, v in kwargs.items():
            setattr(self, k, v)


class FakeExportRepository:
    def __init__(self):
        self.exports = []

    async def create(self, **kwargs):
        export = MockExportRow(**kwargs)
        self.exports.append(export)
        return export

    async def get_all_by_project(self, project_id):
        return [e for e in self.exports if getattr(e, "project_id", None) == project_id]

    async def get_by_id(self, export_id):
        for e in self.exports:
            if getattr(e, "id", None) == export_id:
                return e
        return None


@pytest.mark.asyncio
async def test_get_exports_history_404(app, client, fake_project_repository, fake_profile):
    project = await fake_project_repository.create(owner_id=fake_profile.id, title="Test Projects")
    
    fake_repo = FakeExportRepository()
    from app.api.v1.deps import get_export_repository
    from app.storage.dependencies import get_storage_client
    from conftest import FakeStorageClient
    
    app.dependency_overrides[get_export_repository] = lambda: fake_repo
    app.dependency_overrides[get_storage_client] = lambda: FakeStorageClient()
    
    try:
        async with client:
            response = await client.get(f"/api/v1/projects/{project.id}/exports")
        assert response.status_code == 200
        assert response.json()["data"] == []
    finally:
        app.dependency_overrides.pop(get_export_repository, None)
        app.dependency_overrides.pop(get_storage_client, None)


@pytest.mark.asyncio
async def test_get_export_by_id_endpoint(app, client, fake_project_repository, fake_profile):
    project = await fake_project_repository.create(owner_id=fake_profile.id, title="Test Projects")
    export_id = uuid.uuid4()
    
    fake_repo = FakeExportRepository()
    await fake_repo.create(
        id=export_id,
        project_id=project.id,
        resolution="1080x1920",
        quality="high",
        storage_path="projects/p/exports/e.mp4",
        render_duration_ms=1000,
    )
    
    from app.api.v1.deps import get_export_repository
    from app.storage.dependencies import get_storage_client
    from conftest import FakeStorageClient
    
    app.dependency_overrides[get_export_repository] = lambda: fake_repo
    app.dependency_overrides[get_storage_client] = lambda: FakeStorageClient()
    
    try:
        async with client:
            response = await client.get(f"/api/v1/exports/{export_id}")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["id"] == str(export_id)
        assert data["resolution"] == "1080x1920"
        assert "download_url" in data
    finally:
        app.dependency_overrides.pop(get_export_repository, None)
        app.dependency_overrides.pop(get_storage_client, None)



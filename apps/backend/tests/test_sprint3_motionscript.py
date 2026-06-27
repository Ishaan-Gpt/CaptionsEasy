import uuid
import pytest
from pydantic import ValidationError

from app.db.models.motion_script import MotionScript as MotionScriptRow
from packages.contracts.python import (
    MotionScript,
    validate_motion_script,
    MotionScriptValidationError,
)

# Mock data conforming to MotionScript / RenderPlan schema
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


def test_motion_script_schema_validation():
    # Valid MotionScript compiles and passes validation
    script = validate_motion_script(MOCK_MOTION_SCRIPT_DATA)
    assert script.metadata.project_id == "p-1"
    assert len(script.timeline) == 1
    assert script.timeline[0].payload["text"] == "Hello world"


def test_motion_script_validation_rules():
    # 1. Non-chronological timeline events fail
    invalid_order = dict(MOCK_MOTION_SCRIPT_DATA)
    invalid_order["timeline"] = [
        {
            "id": "evt-1",
            "start_ms": 1000,
            "end_ms": 2000,
            "layer": "captions",
            "type": "caption",
            "payload": {
                "text": "Second",
                "font": "Inter",
                "size": 48.0,
                "weight": "700",
                "color": "#FFFFFF",
                "alignment": "center",
                "animation": "fade",
            },
        },
        {
            "id": "evt-2",
            "start_ms": 0,
            "end_ms": 500,
            "layer": "captions",
            "type": "caption",
            "payload": {
                "text": "First",
                "font": "Inter",
                "size": 48.0,
                "weight": "700",
                "color": "#FFFFFF",
                "alignment": "center",
                "animation": "fade",
            },
        },
    ]
    with pytest.raises(MotionScriptValidationError):
        validate_motion_script(invalid_order)

    # 2. Overlapping events on the same layer fail
    invalid_overlap = dict(MOCK_MOTION_SCRIPT_DATA)
    invalid_overlap["timeline"] = [
        {
            "id": "evt-1",
            "start_ms": 0,
            "end_ms": 1000,
            "layer": "captions",
            "type": "caption",
            "payload": {
                "text": "First",
                "font": "Inter",
                "size": 48.0,
                "weight": "700",
                "color": "#FFFFFF",
                "alignment": "center",
                "animation": "fade",
            },
        },
        {
            "id": "evt-2",
            "start_ms": 500,
            "end_ms": 1500,
            "layer": "captions",
            "type": "caption",
            "payload": {
                "text": "Overlap",
                "font": "Inter",
                "size": 48.0,
                "weight": "700",
                "color": "#FFFFFF",
                "alignment": "center",
                "animation": "fade",
            },
        },
    ]
    with pytest.raises(MotionScriptValidationError):
        validate_motion_script(invalid_overlap)

    # 3. Overlapping transition events fail (scene continuity check)
    invalid_transitions = dict(MOCK_MOTION_SCRIPT_DATA)
    invalid_transitions["timeline"] = [
        {
            "id": "trans-1",
            "start_ms": 0,
            "end_ms": 1000,
            "layer": "overlays",
            "type": "transition",
            "payload": {"type": "fade", "duration": 1.0, "easing": "linear"},
        },
        {
            "id": "trans-2",
            "start_ms": 500,
            "end_ms": 1500,
            "layer": "overlays",
            "type": "transition",
            "payload": {"type": "fade", "duration": 1.0, "easing": "linear"},
        },
    ]
    with pytest.raises(MotionScriptValidationError):
        validate_motion_script(invalid_transitions)


class MockMotionScriptRow:
    def __init__(self, project_id, motion_script_json, version=1):
        self.project_id = project_id
        self.motion_script_json = motion_script_json
        self.version = version


class FakeMotionScriptRepository:
    def __init__(self) -> None:
        self.scripts = []

    async def create(self, *, project_id, motion_script_json, version=1):
        script = MockMotionScriptRow(
            project_id=project_id,
            motion_script_json=motion_script_json,
            version=version,
        )
        self.scripts.append(script)
        return script

    async def get_latest_for_project(self, project_id):
        matches = [s for s in self.scripts if s.project_id == project_id]
        return matches[-1] if matches else None


@pytest.mark.asyncio
async def test_repository_operations():
    project_id = uuid.uuid4()
    repo = FakeMotionScriptRepository()

    # Create motion script
    await repo.create(
        project_id=project_id,
        motion_script_json=MOCK_MOTION_SCRIPT_DATA,
        version=1,
    )
    
    # Fetch latest motion script
    fetched = await repo.get_latest_for_project(project_id)
    assert fetched is not None
    assert fetched.motion_script_json["metadata"]["project_id"] == "p-1"
    assert fetched.version == 1


@pytest.mark.asyncio
async def test_get_motion_script_endpoint_404(app, client, fake_project_repository, fake_profile):
    project = await fake_project_repository.create(owner_id=fake_profile.id, title="Test Script Project")
    
    fake_repo = FakeMotionScriptRepository()
    from app.api.v1.deps import get_motion_script_repository
    app.dependency_overrides[get_motion_script_repository] = lambda: fake_repo
    
    try:
        async with client:
            response = await client.get(f"/api/v1/projects/{project.id}/motion-script")
        assert response.status_code == 404
    finally:
        app.dependency_overrides.pop(get_motion_script_repository, None)


@pytest.mark.asyncio
async def test_get_motion_script_endpoint_success(app, client, fake_project_repository, fake_profile):
    project = await fake_project_repository.create(owner_id=fake_profile.id, title="Test Script Project")
    
    fake_repo = FakeMotionScriptRepository()
    await fake_repo.create(
        project_id=project.id,
        motion_script_json=MOCK_MOTION_SCRIPT_DATA,
        version=1,
    )
    
    from app.api.v1.deps import get_motion_script_repository
    app.dependency_overrides[get_motion_script_repository] = lambda: fake_repo
    
    try:
        async with client:
            response = await client.get(f"/api/v1/projects/{project.id}/motion-script")
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["metadata"]["project_id"] == "p-1"
    finally:
        app.dependency_overrides.pop(get_motion_script_repository, None)

import pytest
import uuid
from sqlalchemy import select
from app.db.models.project import Project as ProjectModel
from app.db.models.export import Export as ExportRow
from app.render.presets import StylePresetManager
from app.ai.providers.dummy.render_plan import DummyRenderPlanProvider
from packages.contracts.python.pipeline import (
    Transcript,
    TranscriptWord,
    CreativePlan,
    CaptionPlan,
    CaptionSegment,
    CaptionStyle,
    EnergyCurvePoint,
    KeyMoment,
)


def test_style_preset_manager_loads_presets():
    manager = StylePresetManager()
    presets = manager.list_presets()
    assert len(presets) >= 7
    
    names = [p.name.lower() for p in presets]
    assert "minimal" in names
    assert "modern" in names
    
    preset = manager.get_preset("modern")
    assert preset is not None
    assert preset.typography.font == "Outfit"
    assert preset.timing.word_limit == 2
    assert preset.typography.color == "#FFFFFF"


@pytest.mark.asyncio
async def test_dummy_render_plan_applies_style():
    provider = DummyRenderPlanProvider()
    transcript = Transcript(
        language="en",
        duration_ms=1000,
        words=[TranscriptWord(text="hello", start_ms=0, end_ms=500, confidence=1.0)]
    )
    creative_plan = CreativePlan(
        speaking_style="clear",
        emotion="neutral",
        pacing="medium",
        energy_curve=[EnergyCurvePoint(t_ms=0, energy=0.5)],
        audience="general",
        key_moments=[KeyMoment(start_ms=0, end_ms=500, label="intro")],
        recommended_style=CaptionStyle.FORMAL,
    )
    caption_plan = CaptionPlan(
        version="1.0",
        caption_segments=[CaptionSegment(id="1", text="hello", start_ms=0, end_ms=500, emphasis=[], confidence=1.0)]
    )

    # Modern style preset
    plan = await provider.plan(
        transcript=transcript,
        creative_plan=creative_plan,
        caption_plan=caption_plan,
        project_id=str(uuid.uuid4()),
        video_id=str(uuid.uuid4()),
        style="modern"
    )
    motion_script = plan.data
    assert motion_script["global_settings"]["default_font"] == "Outfit"
    assert motion_script["global_settings"]["theme"] == "modern"
    assert len(motion_script["global_settings"]["default_colors"]) >= 1


@pytest.mark.asyncio
async def test_patch_project_style_endpoint(client, fake_project_repository, fake_profile):
    project = await fake_project_repository.create(owner_id=fake_profile.id, title="Test Projects")
    
    async with client:
        # Patch style
        res = await client.patch(
            f"/api/v1/projects/{project.id}",
            json={"style": "podcast"}
        )
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["style"] == "podcast"


@pytest.mark.asyncio
async def test_exports_endpoints_metadata(client, fake_project_repository, fake_profile, app):
    project = await fake_project_repository.create(owner_id=fake_profile.id, title="Test Projects")
    export_id = uuid.uuid4()
    
    class FakeExportRepository:
        async def get_all_by_project(self, project_id):
            return [
                ExportRow(
                    id=export_id,
                    project_id=project_id,
                    resolution="1080x1920",
                    quality="high",
                    storage_path="path/to.mp4",
                    render_duration_ms=1200,
                    style="modern",
                    duration_ms=15000,
                    file_size=1048576,
                    status="completed",
                )
            ]
            
        async def get_by_id(self, id):
            if id == export_id:
                return ExportRow(
                    id=export_id,
                    project_id=project.id,
                    resolution="1080x1920",
                    quality="high",
                    storage_path="path/to.mp4",
                    render_duration_ms=1200,
                    style="modern",
                    duration_ms=15000,
                    file_size=1048576,
                    status="completed",
                )
            return None

    from app.api.v1.deps import get_export_repository
    from app.storage.dependencies import get_storage_client
    from conftest import FakeStorageClient

    app.dependency_overrides[get_export_repository] = lambda: FakeExportRepository()
    app.dependency_overrides[get_storage_client] = lambda: FakeStorageClient()

    async with client:
        # List exports
        res = await client.get(f"/api/v1/projects/{project.id}/exports")
        assert res.status_code == 200
        items = res.json()["data"]
        assert len(items) == 1
        assert items[0]["style"] == "modern"
        assert items[0]["duration_ms"] == 15000
        assert items[0]["file_size"] == 1048576
        
        # Get single export
        res = await client.get(f"/api/v1/exports/{export_id}")
        assert res.status_code == 200
        data = res.json()["data"]
        assert data["style"] == "modern"
        assert data["duration_ms"] == 15000
        assert data["file_size"] == 1048576

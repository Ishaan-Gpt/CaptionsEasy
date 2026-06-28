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


@pytest.mark.asyncio
async def test_sentence_highlight_template():
    provider = DummyRenderPlanProvider()
    
    # 9 words total across two segments
    transcript = Transcript(
        language="en",
        duration_ms=9000,
        words=[
            # First segment (0 to 5000ms)
            TranscriptWord(text="This", start_ms=0, end_ms=1000, confidence=1.0),
            TranscriptWord(text="is", start_ms=1000, end_ms=2000, confidence=1.0),
            TranscriptWord(text="a", start_ms=2000, end_ms=3000, confidence=1.0),
            TranscriptWord(text="quick", start_ms=3000, end_ms=4000, confidence=1.0),
            TranscriptWord(text="test.", start_ms=4000, end_ms=5000, confidence=1.0),
            # Second segment words (starts at 6000ms, elapsed_time_ms > 4000ms)
            TranscriptWord(text="Another", start_ms=6000, end_ms=6500, confidence=1.0),
            TranscriptWord(text="second", start_ms=6500, end_ms=7000, confidence=1.0),
            TranscriptWord(text="test", start_ms=7000, end_ms=7500, confidence=1.0),
            TranscriptWord(text="line.", start_ms=7500, end_ms=8000, confidence=1.0),
        ]
    )
    
    creative_plan = CreativePlan(
        speaking_style="conversational",
        emotion="neutral",
        pacing="medium",
        energy_curve=[EnergyCurvePoint(t_ms=0, energy=0.5)],
        audience="general",
        key_moments=[
            KeyMoment(start_ms=0, end_ms=5000, label="intro"),
            KeyMoment(start_ms=6000, end_ms=8000, label="body"),
        ],
        recommended_style=CaptionStyle.FORMAL,
    )
    
    caption_plan = CaptionPlan(
        version="1.0",
        caption_segments=[
            CaptionSegment(id="1", text="This is a quick test.", start_ms=0, end_ms=5000, emphasis=[], confidence=1.0),
            CaptionSegment(id="2", text="Another second test line.", start_ms=6000, end_ms=8000, emphasis=[], confidence=1.0),
        ]
    )

    # Use minimal style (defaults to sentence_highlight)
    plan_out = await provider.plan(
        transcript=transcript,
        creative_plan=creative_plan,
        caption_plan=caption_plan,
        project_id=str(uuid.uuid4()),
        video_id=str(uuid.uuid4()),
        style="minimal",
        caption_template="sentence_highlight",
    )
    
    motion_script_data = plan_out.data
    timeline = motion_script_data["timeline"]
    
    # Check that we have 2 caption events and 9 highlight events
    caption_events = [e for e in timeline if e["type"] == "caption"]
    highlight_events = [e for e in timeline if e["type"] == "highlight"]
    
    assert len(caption_events) == 2
    assert caption_events[0]["payload"]["text"] == "THIS IS A QUICK TEST."
    assert caption_events[1]["payload"]["text"] == "Another second test line."
    
    assert len(highlight_events) == 9
    
    # Validate compiled ASS
    from app.render.engine import RenderEngine
    from packages.contracts.python import validate_motion_script
    
    motion_script = validate_motion_script(motion_script_data)
    engine = RenderEngine(ffmpeg_binary="ffmpeg", ffprobe_binary="ffprobe")
    
    ass_content = engine.generate_ass(motion_script)
    assert ass_content is not None
    
    # Check that active words are wrapped in ASS colors
    assert "{\\1c&H00E0E0E0}THIS{\\1c&H00E0E0E0} IS A QUICK TEST." in ass_content
    
    # Check segment 2 animations (uses default "fade")
    # First line of second segment: starts at 6.00s, ends at 6.50s. Should have fade-in, no fade-out: \fad(150,0)
    seg2_first_line = [line for line in ass_content.splitlines() if "0:00:06.00,0:00:06.50" in line][0]
    assert "\\fad(150,0)" in seg2_first_line
    
    # Second line of second segment: starts at 6.50s, ends at 7.00s. Should have NO fade tags
    seg2_middle_line = [line for line in ass_content.splitlines() if "0:00:06.50,0:00:07.00" in line][0]
    assert "\\fad" not in seg2_middle_line
    
    # Last line of second segment: starts at 7.50s, ends at 7.90s. Should have fade-out, no fade-in: \fad(0,150)
    seg2_last_line = [line for line in ass_content.splitlines() if "0:00:07.50,0:00:07.90" in line][0]
    assert "\\fad(0,150)" in seg2_last_line

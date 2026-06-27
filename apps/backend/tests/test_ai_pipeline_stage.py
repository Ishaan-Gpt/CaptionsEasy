"""Source: Sprint 1.6 brief > Processing — worker wiring of the existing
Sprint 1.4 orchestration engine + Sprint 1.5 speech provider into the
Sprint 1.3 worker pipeline (app.worker.ai_pipeline_stage), via the
"dummy" provider so no network/Groq key is required.
"""

import uuid

import pytest

from app.core.config import get_settings
from app.db.models.video import Video
from app.worker.ai_pipeline_stage import build_ai_pipeline_stages


class FakeSession:
    def __init__(self) -> None:
        self.added: list = []
        self.commits = 0

    def add(self, obj) -> None:
        self.added.append(obj)

    def commit(self) -> None:
        self.commits += 1


def test_speech_analysis_stage_persists_a_transcript_using_dummy_provider():
    project_id = str(uuid.uuid4())
    video = Video(id=uuid.uuid4(), project_id=uuid.UUID(project_id), storage_path="projects/p/videos/v.mp4")
    settings = get_settings().model_copy(update={"speech_provider_name": "dummy"})
    session = FakeSession()

    stages = build_ai_pipeline_stages(
        job_id="job-1", project_id=project_id, video=video, settings=settings, session=session
    )

    assert [s.name for s in stages] == ["Speech Analysis"]
    stages[0].run()

    assert session.commits == 1
    assert len(session.added) == 1
    transcript_row = session.added[0]
    assert str(transcript_row.project_id) == project_id
    assert transcript_row.language == "en"
    assert transcript_row.provider == "dummy"
    assert transcript_row.transcript_json["words"]


def test_speech_analysis_stage_raises_when_no_video_exists():
    settings = get_settings().model_copy(update={"speech_provider_name": "dummy"})
    stages = build_ai_pipeline_stages(
        job_id="job-1", project_id=str(uuid.uuid4()), video=None, settings=settings, session=FakeSession()
    )

    with pytest.raises(ValueError, match="No video found"):
        stages[0].run()

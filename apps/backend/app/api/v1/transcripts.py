"""Transcript endpoint. Source: contracts/api.md > AI Processing

GET /projects/{id}/transcript -> latest persisted Transcript (Sprint 1.5
storage, Sprint 1.6 worker wiring in app.worker.ai_pipeline_stage).
"""

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends

from app.core.errors import NotFoundError
from app.core.responses import success_response
from app.db.models.project import Project
from app.services.transcript_repository import TranscriptRepository

from .deps import get_owned_project, get_transcript_repository

router = APIRouter(tags=["transcripts"])


class WordUpdate(BaseModel):
    text: str
    start_ms: int = Field(ge=0)
    end_ms: int = Field(ge=0)
    confidence: float = Field(ge=0.0, le=1.0)
    highlighted: bool | None = False


class UpdateTranscriptRequest(BaseModel):
    words: list[WordUpdate]


@router.get("/projects/{project_id}/transcript")
async def get_transcript(
    project: Project = Depends(get_owned_project),
    transcript_repository: TranscriptRepository = Depends(get_transcript_repository),
):
    transcript = await transcript_repository.get_latest_for_project(project.id)
    if transcript is None:
        raise NotFoundError("No transcript found for this project yet.")

    return success_response(
        {
            "language": transcript.language,
            "provider": transcript.provider,
            "version": transcript.version,
            "transcript": transcript.transcript_json,
        }
    )


@router.put("/projects/{project_id}/transcript")
async def update_transcript(
    body: UpdateTranscriptRequest,
    project: Project = Depends(get_owned_project),
    transcript_repository: TranscriptRepository = Depends(get_transcript_repository),
):
    transcript = await transcript_repository.get_latest_for_project(project.id)
    if transcript is None:
        raise NotFoundError("No transcript found for this project yet.")

    updated_json = dict(transcript.transcript_json)
    updated_json["words"] = [w.model_dump() for w in body.words]
    transcript = await transcript_repository.update_transcript_json(transcript, updated_json)

    return success_response(
        {
            "language": transcript.language,
            "provider": transcript.provider,
            "version": transcript.version,
            "transcript": transcript.transcript_json,
        }
    )


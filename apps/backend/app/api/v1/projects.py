"""Projects endpoints required for upload. Source: contracts/api.md > Projects

Only the endpoints needed to create and load a project before uploading are
implemented this sprint: POST /projects, GET /projects/{id}. List/rename/
archive/delete are Phase 3 (docs/ROADMAP.md) and out of scope here.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from app.auth.dependencies import get_current_profile
from app.core.responses import success_response
from app.db.models.profile import Profile
from app.db.models.project import Project
from app.db.schemas.project import ProjectRead
from app.services.project_repository import ProjectRepository

from .deps import get_owned_project, get_project_repository

router = APIRouter(tags=["projects"])


class CreateProjectRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)


@router.post("/projects", status_code=201)
async def create_project(
    body: CreateProjectRequest,
    profile: Profile = Depends(get_current_profile),
    project_repository: ProjectRepository = Depends(get_project_repository),
):
    project = await project_repository.create(owner_id=profile.id, title=body.title)
    return success_response(ProjectRead.model_validate(project).model_dump(mode="json"), status_code=201)


@router.get("/projects/{project_id}")
async def get_project(project: Project = Depends(get_owned_project)):
    return success_response(ProjectRead.model_validate(project).model_dump(mode="json"))

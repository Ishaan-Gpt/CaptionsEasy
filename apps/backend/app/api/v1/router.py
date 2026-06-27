from fastapi import APIRouter

from app.api.v1 import jobs, projects, transcripts, upload

api_router = APIRouter()
api_router.include_router(projects.router)
api_router.include_router(upload.router)
api_router.include_router(jobs.router)
api_router.include_router(transcripts.router)

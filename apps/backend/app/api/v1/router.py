from fastapi import APIRouter

from app.api.v1 import projects, upload

api_router = APIRouter()
api_router.include_router(projects.router)
api_router.include_router(upload.router)

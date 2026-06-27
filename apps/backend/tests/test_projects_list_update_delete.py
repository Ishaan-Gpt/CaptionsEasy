"""Source: contracts/api.md > Projects, AI Processing — Sprint 1.6.

Covers the endpoints added this sprint: GET /projects (list), PATCH
/projects/{id}, DELETE /projects/{id}, POST /projects/{id}/process.
"""

import uuid

import pytest


@pytest.mark.asyncio
async def test_list_projects_returns_only_current_owners_non_deleted_projects(
    client, fake_project_repository, fake_profile
):
    mine = await fake_project_repository.create(owner_id=fake_profile.id, title="Mine")
    await fake_project_repository.create(owner_id=uuid.uuid4(), title="Someone else's")
    deleted = await fake_project_repository.create(owner_id=fake_profile.id, title="Deleted")
    await fake_project_repository.soft_delete(deleted)

    async with client:
        response = await client.get("/api/v1/projects")

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    titles = [p["title"] for p in body["data"]]
    assert titles == ["Mine"]
    assert mine.title in titles


@pytest.mark.asyncio
async def test_patch_project_renames(client, fake_project_repository, fake_profile):
    project = await fake_project_repository.create(owner_id=fake_profile.id, title="Old Title")

    async with client:
        response = await client.patch(f"/api/v1/projects/{project.id}", json={"title": "New Title"})

    assert response.status_code == 200
    assert response.json()["data"]["title"] == "New Title"


@pytest.mark.asyncio
async def test_delete_project_soft_deletes(client, fake_project_repository, fake_profile):
    project = await fake_project_repository.create(owner_id=fake_profile.id, title="Bye")

    async with client:
        response = await client.delete(f"/api/v1/projects/{project.id}")

    assert response.status_code == 204
    assert project.deleted_at is not None


@pytest.mark.asyncio
async def test_process_project_without_video_returns_404(client, fake_project_repository, fake_profile):
    project = await fake_project_repository.create(owner_id=fake_profile.id, title="No video yet")

    async with client:
        response = await client.post(f"/api/v1/projects/{project.id}/process")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_process_project_with_video_queues_and_dispatches_ai_pipeline_job(
    client, fake_project_repository, fake_video_repository, fake_job_repository, fake_job_dispatcher, fake_profile
):
    project = await fake_project_repository.create(owner_id=fake_profile.id, title="Has video")
    await fake_video_repository.create(project_id=project.id, storage_path="projects/x/videos/v.mp4", file_size=10)

    async with client:
        response = await client.post(f"/api/v1/projects/{project.id}/process")

    assert response.status_code == 202
    job_id = response.json()["data"]["jobId"]
    assert job_id in fake_job_dispatcher.dispatched_job_ids

    from app.worker.ai_pipeline_stage import AI_PIPELINE_JOB_TYPE

    queued_job = await fake_job_repository.get_by_id(uuid.UUID(job_id))
    assert queued_job.job_type == AI_PIPELINE_JOB_TYPE

import io

MP4_BYTES = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 1024


async def _create_project(client, title="Test Project"):
    response = await client.post("/api/v1/projects", json={"title": title})
    assert response.status_code == 201
    return response.json()["data"]


async def test_upload_video_success(client, fake_storage_client, fake_job_repository):
    async with client as c:
        project = await _create_project(c)

        response = await c.post(
            f"/api/v1/projects/{project['id']}/upload",
            files={"file": ("clip.mp4", io.BytesIO(MP4_BYTES), "video/mp4")},
        )

    assert response.status_code == 202
    body = response.json()
    assert body["success"] is True
    assert body["data"]["status"] == "UPLOADED"
    assert body["data"]["videoId"]
    assert body["data"]["jobId"]

    # Binary stored in (fake) Supabase Storage, not the database.
    assert len(fake_storage_client.uploads) == 1
    assert fake_storage_client.uploads[0]["content_type"] == "video/mp4"

    # Job created queued/progress 0 — no worker started.
    job = fake_job_repository.jobs[0]
    assert job.status.value == "queued"
    assert job.progress == 0


async def test_upload_rejects_unsupported_format(client):
    async with client as c:
        project = await _create_project(c)

        response = await c.post(
            f"/api/v1/projects/{project['id']}/upload",
            files={"file": ("clip.avi", io.BytesIO(MP4_BYTES), "video/x-msvideo")},
        )

    assert response.status_code == 400
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "UNSUPPORTED_VIDEO_FORMAT"


async def test_upload_rejects_oversized_file(client, monkeypatch):
    from app.core import config as config_module

    settings = config_module.get_settings()
    monkeypatch.setattr(settings, "max_upload_size_bytes", 10)

    async with client as c:
        project = await _create_project(c)

        response = await c.post(
            f"/api/v1/projects/{project['id']}/upload",
            files={"file": ("clip.mp4", io.BytesIO(MP4_BYTES), "video/mp4")},
        )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VIDEO_TOO_LARGE"


async def test_upload_rejects_corrupted_file(client):
    async with client as c:
        project = await _create_project(c)

        response = await c.post(
            f"/api/v1/projects/{project['id']}/upload",
            files={"file": ("clip.mp4", io.BytesIO(b"not a real video"), "video/mp4")},
        )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "CORRUPTED_UPLOAD"


async def test_upload_status_after_upload(client):
    async with client as c:
        project = await _create_project(c)
        await c.post(
            f"/api/v1/projects/{project['id']}/upload",
            files={"file": ("clip.mp4", io.BytesIO(MP4_BYTES), "video/mp4")},
        )

        response = await c.get(f"/api/v1/projects/{project['id']}/upload/status")

    assert response.status_code == 200
    body = response.json()["data"]
    assert body["status"] == "QUEUED"
    assert body["progress"] == 0


async def test_upload_to_unowned_project_is_forbidden(client, fake_project_repository, fake_profile):
    import uuid

    from app.db.models.project import Project

    other_owner_id = uuid.uuid4()
    foreign_project = Project(id=uuid.uuid4(), owner_id=other_owner_id, title="Not yours")
    fake_project_repository.projects[foreign_project.id] = foreign_project

    async with client as c:
        response = await c.post(
            f"/api/v1/projects/{foreign_project.id}/upload",
            files={"file": ("clip.mp4", io.BytesIO(MP4_BYTES), "video/mp4")},
        )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"

import io

MP4_BYTES = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 1024


async def test_get_job_status_returns_live_progress_when_cached(
    client, fake_job_repository, fake_progress_reporter
):
    async with client as c:
        project_resp = await c.post("/api/v1/projects", json={"title": "P"})
        project = project_resp.json()["data"]

        upload_resp = await c.post(
            f"/api/v1/projects/{project['id']}/upload",
            files={"file": ("clip.mp4", io.BytesIO(MP4_BYTES), "video/mp4")},
        )
        job_id = upload_resp.json()["data"]["jobId"]

        fake_progress_reporter.set_progress(
            job_id, stage="Extract Audio", percentage=66, estimated_remaining_ms=1000
        )

        response = await c.get(f"/api/v1/jobs/{job_id}")

    assert response.status_code == 200
    body = response.json()["data"]
    assert body == {"progress": 66, "stage": "Extract Audio", "estimated_remaining_ms": 1000}


async def test_get_job_status_falls_back_to_persisted_status_without_live_progress(client):
    async with client as c:
        project_resp = await c.post("/api/v1/projects", json={"title": "P"})
        project = project_resp.json()["data"]

        upload_resp = await c.post(
            f"/api/v1/projects/{project['id']}/upload",
            files={"file": ("clip.mp4", io.BytesIO(MP4_BYTES), "video/mp4")},
        )
        job_id = upload_resp.json()["data"]["jobId"]

        response = await c.get(f"/api/v1/jobs/{job_id}")

    assert response.status_code == 200
    body = response.json()["data"]
    assert body["stage"] == "queued"
    assert body["progress"] == 0


async def test_get_job_status_unowned_job_is_forbidden(
    client, fake_job_repository, fake_project_repository
):
    import uuid

    from app.db.enums import JobStatus
    from app.db.models.job import Job
    from app.db.models.project import Project

    async with client as c:
        # Job belongs to a project owned by someone else.
        foreign_project = Project(id=uuid.uuid4(), owner_id=uuid.uuid4(), title="Not yours")
        fake_project_repository.projects[foreign_project.id] = foreign_project

        foreign_job = Job(
            id=uuid.uuid4(),
            project_id=foreign_project.id,
            job_type="video_metadata_extraction",
            status=JobStatus.QUEUED,
            progress=0,
        )
        fake_job_repository.jobs.append(foreign_job)

        response = await c.get(f"/api/v1/jobs/{foreign_job.id}")

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"

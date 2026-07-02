"""Source: contracts/api.md > GET /projects/{id}/transcript — Sprint 1.6."""

import pytest


@pytest.mark.asyncio
async def test_get_transcript_404_when_none_persisted_yet(client, fake_project_repository, fake_profile):
    project = await fake_project_repository.create(owner_id=fake_profile.id, title="No transcript")

    async with client:
        response = await client.get(f"/api/v1/projects/{project.id}/transcript")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_get_transcript_returns_latest_persisted_transcript(
    client, fake_project_repository, fake_transcript_repository, fake_profile
):
    project = await fake_project_repository.create(owner_id=fake_profile.id, title="Has transcript")
    await fake_transcript_repository.create(
        project_id=project.id,
        language="en",
        provider="dummy",
        version=1,
        transcript_json={"version": "1.0", "language": "en", "duration_ms": 1000, "words": []},
    )

    async with client:
        response = await client.get(f"/api/v1/projects/{project.id}/transcript")

    assert response.status_code == 200
    body = response.json()["data"]
    assert body["language"] == "en"
    assert body["provider"] == "dummy"
    assert body["transcript"]["words"] == []


@pytest.mark.asyncio
async def test_update_transcript_success(
    client, fake_project_repository, fake_transcript_repository, fake_profile
):
    project = await fake_project_repository.create(owner_id=fake_profile.id, title="Edit transcript")
    await fake_transcript_repository.create(
        project_id=project.id,
        language="en",
        provider="dummy",
        version=1,
        transcript_json={"version": "1.0", "language": "en", "duration_ms": 1000, "words": []},
    )

    updated_words = [
        {"text": "Hello", "start_ms": 0, "end_ms": 200, "confidence": 0.99, "highlighted": False},
        {"text": "World", "start_ms": 250, "end_ms": 500, "confidence": 0.95, "highlighted": True}
    ]

    async with client:
        response = await client.put(
            f"/api/v1/projects/{project.id}/transcript",
            json={"words": updated_words}
        )

    assert response.status_code == 200
    body = response.json()["data"]
    assert len(body["transcript"]["words"]) == 2
    assert body["transcript"]["words"][0]["text"] == "Hello"
    assert body["transcript"]["words"][1]["highlighted"] is True

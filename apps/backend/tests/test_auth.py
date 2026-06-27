import uuid

import jwt
import pytest

from app.auth.jwt import InvalidTokenError, decode_supabase_jwt
from app.core.config import Settings


@pytest.fixture
def settings() -> Settings:
    return Settings(
        DATABASE_URL_ASYNC="postgresql+asyncpg://test:test@localhost/test",
        SUPABASE_JWT_SECRET="test-secret",
        SUPABASE_URL="https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY="test-key",
    )


def test_decodes_valid_token(settings):
    user_id = str(uuid.uuid4())
    token = jwt.encode({"sub": user_id}, settings.supabase_jwt_secret, algorithm="HS256")

    claims = decode_supabase_jwt(token, settings)

    assert claims["sub"] == user_id


def test_rejects_token_signed_with_wrong_secret(settings):
    token = jwt.encode({"sub": str(uuid.uuid4())}, "wrong-secret", algorithm="HS256")

    with pytest.raises(InvalidTokenError):
        decode_supabase_jwt(token, settings)


def test_rejects_malformed_token(settings):
    with pytest.raises(InvalidTokenError):
        decode_supabase_jwt("not-a-jwt", settings)


async def test_upload_endpoint_requires_auth(app):
    import httpx

    from app.auth.dependencies import get_current_profile

    # The `app` fixture bypasses auth by default; remove that override here
    # to exercise the real bearer-token check.
    app.dependency_overrides.pop(get_current_profile, None)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(f"/api/v1/projects/{uuid.uuid4()}/upload")

    assert response.status_code == 401
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "UNAUTHORIZED"

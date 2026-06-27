"""Authentication dependencies (DI). Source: contracts/api.md ("JWT Protected"),
contracts/database.md > profiles.

Resolves the bearer token to an authenticated Profile row. Every authenticated
request is scoped to exactly one profile/owner, per database.md > RLS rule.
"""

import uuid

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import InvalidTokenError, decode_supabase_jwt
from app.core.config import Settings, get_settings
from app.core.errors import UnauthorizedError
from app.db.models.profile import Profile
from app.db.session import get_db

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_auth_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> uuid.UUID:
    if credentials is None:
        raise UnauthorizedError("Missing bearer token.")

    try:
        claims = decode_supabase_jwt(credentials.credentials, settings)
    except InvalidTokenError as exc:
        raise UnauthorizedError("Invalid or expired token.") from exc

    sub = claims.get("sub")
    if not sub:
        raise UnauthorizedError("Token is missing a subject claim.")

    try:
        return uuid.UUID(sub)
    except ValueError as exc:
        raise UnauthorizedError("Token subject is not a valid user id.") from exc


async def get_current_profile(
    auth_user_id: uuid.UUID = Depends(get_current_auth_user_id),
    db: AsyncSession = Depends(get_db),
) -> Profile:
    """Resolves the Profile row for the authenticated Supabase user.

    TODO(api.md): /auth/register is out of scope for this sprint (upload
    foundation only). Profile provisioning for a first-time authenticated
    user is intentionally minimal here — it upserts a bare Profile row
    rather than implementing the full registration flow.
    """
    result = await db.execute(select(Profile).where(Profile.auth_user_id == auth_user_id))
    profile = result.scalar_one_or_none()
    if profile is not None:
        return profile

    profile = Profile(auth_user_id=auth_user_id)
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile

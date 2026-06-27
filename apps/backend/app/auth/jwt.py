"""Supabase JWT verification. Source: contracts/api.md ("JWT Protected")

Decodes and validates the bearer token issued by Supabase Auth. Never logs
the raw token (ai-context/SHARED_CONTEXT.md > Security: "Never log access
tokens.").
"""

import jwt

from app.core.config import Settings


class InvalidTokenError(Exception):
    pass


def decode_supabase_jwt(token: str, settings: Settings) -> dict:
    """Returns the decoded claims. `sub` is the Supabase auth.users.id (uuid)."""
    try:
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=[settings.supabase_jwt_algorithm],
            options={"verify_aud": False},
        )
    except jwt.PyJWTError as exc:
        raise InvalidTokenError(str(exc)) from exc

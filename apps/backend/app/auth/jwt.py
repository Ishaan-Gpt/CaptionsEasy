"""Supabase JWT verification. Source: contracts/api.md ("JWT Protected")

Decodes and validates the bearer token issued by Supabase Auth. Never logs
the raw token (ai-context/SHARED_CONTEXT.md > Security: "Never log access
tokens.").

Supabase projects sign access tokens one of two ways:
- Legacy: HS256 against a shared secret (SUPABASE_JWT_SECRET).
- Current default for new projects: asymmetric "JWT Signing Keys" (e.g.
  ES256), verified against the project's public JWKS endpoint instead of a
  shared secret. The token header's `alg`/`kid` tell us which path applies —
  there is no other way to know which mode a given project uses.
"""

import logging
from functools import lru_cache

import jwt
from jwt import PyJWKClient

from app.core.config import Settings

logger = logging.getLogger("motionai.api")

_HS_ALGORITHMS = {"HS256", "HS384", "HS512"}


class InvalidTokenError(Exception):
    pass


@lru_cache(maxsize=1)
def _jwks_client(jwks_url: str) -> PyJWKClient:
    return PyJWKClient(jwks_url)


def decode_supabase_jwt(token: str, settings: Settings) -> dict:
    """Returns the decoded claims. `sub` is the Supabase auth.users.id (uuid)."""
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", settings.supabase_jwt_algorithm)

        if alg in _HS_ALGORITHMS:
            signing_key: str | jwt.PyJWK = settings.supabase_jwt_secret
        else:
            jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
            signing_key = _jwks_client(jwks_url).get_signing_key_from_jwt(token).key

        return jwt.decode(
            token,
            signing_key,
            algorithms=[alg],
            options={"verify_aud": False},
        )
    except jwt.PyJWTError as exc:
        # The *reason* a token failed (expired/bad signature/wrong alg) is
        # safe, useful diagnostic info on its own — only the raw token value
        # itself must never be logged (SHARED_CONTEXT.md > Security).
        logger.warning("jwt_decode_failed reason=%s", exc)
        raise InvalidTokenError(str(exc)) from exc

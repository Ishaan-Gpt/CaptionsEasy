"""Standard response envelope. Source: contracts/api.md > Standard Response Format

Every endpoint returns:
{ "success": bool, "data": ..., "meta": {...}, "error": null | {...} }

Error objects follow contracts/json-schemas.md > Error Schema: code, message,
details, retryable, timestamp.
"""

from datetime import datetime, timezone
from typing import Any

from fastapi.responses import JSONResponse


def success_response(data: Any, *, meta: dict | None = None, status_code: int = 200) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"success": True, "data": data, "meta": meta or {}, "error": None},
    )


def error_payload(
    *, code: str, message: str, details: dict | None = None, retryable: bool = False
) -> dict:
    return {
        "success": False,
        "data": None,
        "error": {
            "code": code,
            "message": message,
            "details": details,
            "retryable": retryable,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }

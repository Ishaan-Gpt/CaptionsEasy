"""Structured logging. Source: ai-context/SHARED_CONTEXT.md > Logging

"Every request logs: Request ID, Project ID, User ID, Duration, Status, Errors."
"""

import logging
import sys
import time
import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)

logger = logging.getLogger("motionai.api")


def configure_logging(level: str = "INFO") -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Assigns a correlation/request id and logs request id, duration, and status
    for every request, per the logging contract above.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        token = request_id_ctx.set(request_id)
        start = time.monotonic()
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.monotonic() - start) * 1000
            logger.exception(
                "request_failed",
                extra={"request_id": request_id, "path": request.url.path, "duration_ms": duration_ms},
            )
            raise
        else:
            duration_ms = (time.monotonic() - start) * 1000
            logger.info(
                "request_completed",
                extra={
                    "request_id": request_id,
                    "path": request.url.path,
                    "method": request.method,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                },
            )
            response.headers["x-request-id"] = request_id
            return response
        finally:
            request_id_ctx.reset(token)

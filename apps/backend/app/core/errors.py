"""Application error types and exception handlers.

Source: ai-context/SHARED_CONTEXT.md > Error Handling
"Every error should contain: Error Code, Human Message ... Never return generic errors."
"""

import logging

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from starlette.responses import JSONResponse

from app.core.responses import error_payload

logger = logging.getLogger("motionai.api")


class AppError(Exception):
    """Base class for application errors with a stable code + HTTP status."""

    status_code: int = 400
    code: str = "APP_ERROR"
    # 5xx/429 are transient by default (worth a client retry); 4xx generally
    # is not, since retrying the same request/input won't change the outcome.
    retryable: bool = False

    def __init__(
        self,
        message: str,
        *,
        code: str | None = None,
        status_code: int | None = None,
        details: dict | None = None,
        retryable: bool | None = None,
    ):
        self.message = message
        self.details = details
        if code is not None:
            self.code = code
        if status_code is not None:
            self.status_code = status_code
        if retryable is not None:
            self.retryable = retryable
        elif self.status_code >= 500 or self.status_code == 429:
            self.retryable = True
        super().__init__(message)


class ValidationFailedError(AppError):
    status_code = 422
    code = "VALIDATION_ERROR"


class UnsupportedMediaTypeError(AppError):
    status_code = 400
    code = "UNSUPPORTED_VIDEO_FORMAT"


class VideoTooLargeError(AppError):
    status_code = 400
    code = "VIDEO_TOO_LARGE"


class CorruptedUploadError(AppError):
    status_code = 400
    code = "CORRUPTED_UPLOAD"


class UnauthorizedError(AppError):
    status_code = 401
    code = "UNAUTHORIZED"


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"


class ForbiddenError(AppError):
    status_code = 403
    code = "FORBIDDEN"


class RateLimitExceededError(AppError):
    status_code = 429
    code = "RATE_LIMIT_EXCEEDED"


def register_exception_handlers(app: FastAPI) -> None:
    from starlette.exceptions import HTTPException as StarletteHTTPException

    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        logger.warning(
            "app_error code=%s path=%s message=%s",
            exc.code,
            request.url.path,
            exc.message,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=error_payload(
                code=exc.code, message=exc.message, details=exc.details, retryable=exc.retryable
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=error_payload(
                code="HTTP_ERROR",
                message=exc.detail,
                retryable=(exc.status_code == 429 or exc.status_code >= 500)
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=error_payload(
                code="VALIDATION_ERROR",
                message="Request validation failed.",
                details={"errors": jsonable_encoder(exc.errors())},
                retryable=False,
            ),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled_error path=%s", request.url.path)
        return JSONResponse(
            status_code=500,
            content=error_payload(
                code="INTERNAL_ERROR", message="An unexpected error occurred.", retryable=True
            ),
        )

"""Application error types and exception handlers.

Source: ai-context/SHARED_CONTEXT.md > Error Handling
"Every error should contain: Error Code, Human Message ... Never return generic errors."
"""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from starlette.responses import JSONResponse

from app.core.responses import error_payload

logger = logging.getLogger("motionai.api")


class AppError(Exception):
    """Base class for application errors with a stable code + HTTP status."""

    status_code: int = 400
    code: str = "APP_ERROR"

    def __init__(self, message: str, *, code: str | None = None, status_code: int | None = None):
        self.message = message
        if code is not None:
            self.code = code
        if status_code is not None:
            self.status_code = status_code
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


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        logger.warning(
            "app_error",
            extra={"code": exc.code, "error_message": exc.message, "path": request.url.path},
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=error_payload(code=exc.code, message=exc.message),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content=error_payload(code="VALIDATION_ERROR", message="Request validation failed."),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled_error", extra={"path": request.url.path})
        return JSONResponse(
            status_code=500,
            content=error_payload(code="INTERNAL_ERROR", message="An unexpected error occurred."),
        )

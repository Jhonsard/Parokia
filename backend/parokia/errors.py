"""Application-wide exception handlers producing a single JSON error shape."""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import settings
from .services import ServiceError

log = logging.getLogger("parokia.errors")


def _envelope(request: Request, status_code: int, code: str, message: str, details: object = None) -> JSONResponse:
    """Return the canonical error body shared by every failure mode."""
    payload: dict[str, object] = {
        "error": {
            "code": code,
            "message": message,
            "path": request.url.path,
        }
    }
    if details is not None:
        payload["error"]["details"] = details  # type: ignore[index]
    return JSONResponse(status_code=status_code, content=payload)


def register_exception_handlers(app: FastAPI) -> None:
    """Attach every handler to the FastAPI application."""

    @app.exception_handler(ServiceError)
    async def _service_error(request: Request, exc: ServiceError) -> JSONResponse:
        if exc.status_code >= 500:
            log.exception("Service failure on %s", request.url.path)
        return _envelope(request, exc.status_code, "service_error", exc.message)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        fields = [
            {
                "field": ".".join(str(part) for part in error.get("loc", ())[1:]) or "body",
                "message": error.get("msg", "invalid value"),
                "type": error.get("type", "value_error"),
            }
            for error in exc.errors()
        ]
        log.info("Validation error on %s: %s", request.url.path, fields)
        return _envelope(
            request,
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "validation_error",
            "Request payload failed validation",
            fields,
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
        return _envelope(request, exc.status_code, f"http_{exc.status_code}", detail)

    @app.exception_handler(IntegrityError)
    async def _integrity_error(request: Request, exc: IntegrityError) -> JSONResponse:
        log.warning("Integrity error on %s: %s", request.url.path, exc.orig)
        return _envelope(
            request,
            status.HTTP_409_CONFLICT,
            "integrity_error",
            "The request conflicts with existing data",
        )

    @app.exception_handler(SQLAlchemyError)
    async def _database_error(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        log.exception("Database error on %s", request.url.path)
        return _envelope(
            request,
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "database_error",
            "The database is temporarily unavailable",
        )

    @app.exception_handler(Exception)
    async def _unhandled_error(request: Request, exc: Exception) -> JSONResponse:
        log.exception("Unhandled error on %s", request.url.path)
        message = str(exc) if settings.debug else "Internal server error"
        return _envelope(
            request, status.HTTP_500_INTERNAL_SERVER_ERROR, "internal_error", message
        )


__all__ = ["register_exception_handlers"]
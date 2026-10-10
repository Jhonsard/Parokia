"""FastAPI application factory for the Parokia REST API.

The MCP automation server lives in :mod:`parokia.mcp_server` and is started as a
separate stdio process so that agents and HTTP clients never contend for the same
event loop.
"""

from __future__ import annotations

import logging
import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .errors import register_exception_handlers
from .routers import api_router
from .seed import run_seed
from .version import __version__

log = logging.getLogger("parokia.api")

DESCRIPTION = """
REST API for the Notre-Dame d'Afrique parish platform (Goma).

* **Public** — chapels, mass schedules, liturgical theme, membership requests.
* **Authenticated** — choir and mass management, membership review.
* **Roles** — `ADMIN`, `CHOIR_LEADER`, `PUBLIC`.

Authenticate with `POST /api/auth/token` (OAuth2 form) or `POST /api/auth/login`
(JSON), then send `Authorization: Bearer <token>`.
"""


def configure_logging() -> None:
    """Install a single structured logging configuration for the whole process."""
    logging.basicConfig(
        level=logging.DEBUG if settings.debug else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        force=True,
    )
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Prepare the database on startup and release resources on shutdown."""
    configure_logging()
    log.info(
        "Starting %s v%s (environment=%s, dialect=%s)",
        settings.app_name,
        __version__,
        settings.environment,
        settings.dialect,
    )
    if settings.seed_on_startup:
        run_seed()
    yield
    log.info("Shutting down %s.", settings.app_name)


def create_app() -> FastAPI:
    """Build and wire the FastAPI application."""
    application = FastAPI(
        title=settings.app_name,
        description=DESCRIPTION,
        version=__version__,
        lifespan=lifespan,
        docs_url="/docs" if settings.docs_enabled else None,
        redoc_url="/redoc" if settings.docs_enabled else None,
        openapi_url="/openapi.json" if settings.docs_enabled else None,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID", "Retry-After"],
        max_age=600,
    )

    @application.middleware("http")
    async def correlate_requests(request: Request, call_next) -> Response:
        """Attach a request id and measure latency for every request."""
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - started) * 1000
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time-ms"] = f"{elapsed_ms:.1f}"
        if elapsed_ms > 500:
            log.warning("Slow request %s %s took %.1f ms", request.method, request.url.path, elapsed_ms)
        return response

    register_exception_handlers(application)
    application.include_router(api_router)
    return application


app = create_app()

__all__ = ["app", "create_app"]
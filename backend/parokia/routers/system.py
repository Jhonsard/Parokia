"""Liveness and readiness probes."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Response, status

from ..config import settings
from ..database import database_health
from ..schemas import HealthResponse

router = APIRouter(tags=["System"])


@router.get("/api/health", response_model=HealthResponse, summary="Liveness probe")
def health(response: Response) -> HealthResponse:
    """Report process and database status. Returns 503 when the database is unreachable."""
    db_state = database_health()
    healthy = db_state["status"] == "ok"
    if not healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return HealthResponse(
        status="ok" if healthy else "degraded",
        service="parokia-api",
        version=settings.app_version,
        environment=settings.environment,
        database=settings.dialect,
        database_status=db_state["status"],
        timestamp=datetime.now(timezone.utc),
    )


@router.get("/api", summary="API index")
def api_index() -> dict[str, object]:
    """Machine-readable description of the API surface."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "documentation": "/docs" if settings.docs_enabled else None,
        "endpoints": [
            "/api/health",
            "/api/auth/token",
            "/api/auth/register",
            "/api/auth/me",
            "/api/chapels",
            "/api/choirs",
            "/api/masses",
            "/api/membership-requests",
            "/api/liturgical-theme",
        ],
    }
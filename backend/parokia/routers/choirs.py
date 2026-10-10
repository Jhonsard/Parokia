"""Choir management endpoints (ADMIN creates and moderates, leaders read)."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Body, Depends, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import (
    ChoirCreate,
    ChoirRecord,
    ChoirStatusUpdate,
    Page,
    Role,
    UserRecord,
)
from ..security import require_admin
from ..services import ServiceError, create_choir, create_user, list_choirs, set_choir_status

router = APIRouter(prefix="/api/choirs", tags=["Choirs"])


@router.get("", summary="List choirs")
def get_choirs(
    chapel_id: Optional[int] = Query(default=None, gt=0),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> Page[ChoirRecord]:
    """List choirs with optional chapel and status filters."""
    items, total = list_choirs(db, chapel_id, status_filter, limit, offset)
    return Page.build(items, total, limit, offset)


@router.get("/{choir_id}", response_model=ChoirRecord, summary="Get one choir")
def get_choir(choir_id: int, db: Session = Depends(get_db)) -> ChoirRecord:
    """Return a single choir by ID."""
    items, _ = list_choirs(db, limit=200)
    for item in items:
        if item.id == choir_id:
            return item
    raise ServiceError("Choir not found", status_code=404)


@router.post(
    "",
    response_model=ChoirRecord,
    status_code=status.HTTP_201_CREATED,
    summary="Create a choir (ADMIN)",
)
def post_choir(
    payload: ChoirCreate,
    _admin: UserRecord = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ChoirRecord:
    """Create a choir in PENDING state."""
    return create_choir(db, payload.model_dump())


@router.patch(
    "/{choir_id}/status",
    response_model=ChoirRecord,
    summary="Change the approval status of a choir (ADMIN)",
)
def patch_choir_status(
    choir_id: int,
    payload: ChoirStatusUpdate,
    _admin: UserRecord = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ChoirRecord:
    """Approve or reject a choir."""
    return set_choir_status(db, choir_id, payload.status)


@router.post(
    "/{choir_id}/members",
    status_code=status.HTTP_201_CREATED,
    summary="Register a CHOIR_LEADER for a choir (ADMIN)",
)
def post_choir_leader(
    choir_id: int,
    payload: dict[str, str] = Body(
        ...,
        examples=[
            {
                "full_name": "Grâce Mateso",
                "email": "grace.mateso@parokia.org",
                "password": "a-strong-password",
            }
        ],
    ),
    _admin: UserRecord = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    """Provision the leader account bound to a choir."""
    missing = [key for key in ("full_name", "email", "password") if not payload.get(key)]
    if missing:
        raise ServiceError(f"Missing fields: {', '.join(missing)}", status_code=422)
    record = create_user(
        db,
        payload["full_name"],
        payload["email"],
        payload["password"],
        Role.CHOIR_LEADER,
        choir_id=choir_id,
    )
    return {"user": record.model_dump(mode="json")}
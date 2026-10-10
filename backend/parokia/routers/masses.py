"""Mass schedule endpoints (the parish agenda)."""

from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import MassScheduleCreate, MassScheduleRecord, Page, UserRecord
from ..security import require_admin, require_chapel_or_admin
from ..services import create_mass, delete_mass, list_masses

router = APIRouter(prefix="/api/masses", tags=["Masses"])


@router.get("", summary="List mass schedules")
def get_masses(
    chapel_id: Optional[int] = Query(default=None, gt=0),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> Page[MassScheduleRecord]:
    """List masses, optionally scoped to one chapel and a date window."""
    items, total = list_masses(db, chapel_id, start_date, end_date, limit, offset)
    return Page.build(items, total, limit, offset)


@router.post(
    "",
    response_model=MassScheduleRecord,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule a mass (ADMIN or CHOIR_LEADER)",
)
def post_mass(
    payload: MassScheduleCreate,
    _actor: UserRecord = Depends(require_chapel_or_admin),
    db: Session = Depends(get_db),
) -> MassScheduleRecord:
    """Create a mass schedule entry and return the persisted row."""
    return create_mass(db, payload)


@router.delete(
    "/{mass_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a mass (ADMIN)",
)
def remove_mass(
    mass_id: int,
    _admin: UserRecord = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    """Delete a mass schedule entry."""
    delete_mass(db, mass_id)
"""Chapel directory endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import ChapelRecord
from ..services import get_chapel_or_404, list_chapels

router = APIRouter(prefix="/api/chapels", tags=["Chapels"])


@router.get("", response_model=list[ChapelRecord], summary="List all chapels")
def get_chapels(db: Session = Depends(get_db)) -> list[ChapelRecord]:
    """Return the eight chapel communities, ordered canonically."""
    return list_chapels(db)


@router.get("/{chapel_id}", response_model=ChapelRecord, summary="Get one chapel")
def get_chapel(chapel_id: int, db: Session = Depends(get_db)) -> ChapelRecord:
    """Return a single chapel by numeric ID."""
    return ChapelRecord.model_validate(get_chapel_or_404(db, chapel_id))


@router.get("/by-code/{code}", response_model=ChapelRecord, summary="Get one chapel by code")
def get_chapel_by_code(code: str, db: Session = Depends(get_db)) -> ChapelRecord:
    """Return a chapel by its mnemonic code (TGN, USH, AMN, …).

    The public frontend stores codes rather than numeric IDs, so this route keeps
    the client contract stable when the database is reseeded.
    """
    from sqlalchemy import func, select

    from ..models import Chapel

    chapel = db.scalar(select(Chapel).where(func.upper(Chapel.code) == code.strip().upper()))
    if chapel is None:
        from ..services import ServiceError

        raise ServiceError("Chapel not found", status_code=404)
    return ChapelRecord.model_validate(chapel)
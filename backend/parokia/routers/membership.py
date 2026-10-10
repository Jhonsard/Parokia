"""Choir membership request endpoints (the public onboarding form and its review queue)."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import (
    MembershipRequestCreate,
    MembershipRequestRecord,
    MembershipReview,
    Page,
    UserRecord,
)
from ..security import enforce_throttle, membership_throttle, require_admin, require_chapel_or_admin
from ..services import create_membership_request, list_membership_requests, review_membership_request

router = APIRouter(prefix="/api/membership-requests", tags=["Membership"])


@router.post(
    "",
    response_model=MembershipRequestRecord,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a choir membership request (public)",
)
def post_membership_request(
    payload: MembershipRequestCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> MembershipRequestRecord:
    """Store a request in PENDING state for later ADMIN review."""
    enforce_throttle(request, membership_throttle, "Too many membership requests from this client")
    return create_membership_request(db, payload)


@router.get("", summary="List membership requests (ADMIN or CHOIR_LEADER)")
def get_membership_requests(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _actor: UserRecord = Depends(require_chapel_or_admin),
    db: Session = Depends(get_db),
) -> Page[MembershipRequestRecord]:
    """Return the review queue, newest first."""
    items, total = list_membership_requests(db, status_filter, limit, offset)
    return Page.build(items, total, limit, offset)


@router.patch(
    "/{request_id}",
    response_model=MembershipRequestRecord,
    summary="Approve or reject a request (ADMIN)",
)
def patch_membership_request(
    request_id: int,
    payload: MembershipReview,
    current: UserRecord = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MembershipRequestRecord:
    """Review a pending request.

    Approving also provisions the choir in APPROVED state together with a leader
    account, so the parish gains a usable entry in the agenda.
    """
    return review_membership_request(
        db,
        request_id=request_id,
        approve=payload.action == "approve",
        reviewer_id=current.id,
        reason=payload.reason,
    )
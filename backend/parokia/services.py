"""Domain services shared by the REST API and the FastMCP automation server.

Keeping the business rules here guarantees that an MCP tool and a REST endpoint
cannot drift apart: both call the exact same functions.
"""

from __future__ import annotations

import logging
import re
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional, Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Chapel, Choir, LiturgicalSetting, MassSchedule, MembershipRequest, User
from .schemas import (
    ChapelRecord,
    ChoirRecord,
    LiturgicalThemeRecord,
    MassScheduleCreate,
    MassScheduleRecord,
    MembershipRequestCreate,
    MembershipRequestRecord,
    RequestStatus,
    Role,
    UserRecord,
)
from .security import hash_password

log = logging.getLogger("parokia.services")

HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")

DEFAULT_THEME_COLOR = "#0284C7"
DEFAULT_THEME_SEASON = "Fêtes mariales"


class ServiceError(Exception):
    """Business-rule violation mapped to an HTTP error by the router layer."""

    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


# ---------------------------------------------------------------------------
# Generic helpers
# ---------------------------------------------------------------------------


def paginate(stmt: Any, db: Session, limit: int, offset: int) -> tuple[List[Any], int]:
    """Execute a select with LIMIT/OFFSET and return ``(rows, total_count)``."""
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    rows = list(db.scalars(stmt.limit(limit).offset(offset)).all())
    return rows, int(total)


def normalize_color(color_code: str) -> str:
    """Validate and uppercase a six-digit hex colour."""
    if not HEX_COLOR_RE.match(color_code or ""):
        raise ServiceError("color_code must be a hex string such as #0284C7", status_code=422)
    return color_code.upper()


# ---------------------------------------------------------------------------
# Chapels
# ---------------------------------------------------------------------------


def list_chapels(db: Session) -> List[ChapelRecord]:
    """Return every chapel ordered by declaration order."""
    rows = db.scalars(select(Chapel).order_by(Chapel.id)).all()
    return [ChapelRecord.model_validate(row) for row in rows]


def get_chapel_or_404(db: Session, chapel_id: int) -> Chapel:
    """Fetch a chapel or raise a 404-mapped :class:`ServiceError`."""
    chapel = db.get(Chapel, chapel_id)
    if chapel is None:
        raise ServiceError("Chapel not found", status_code=404)
    return chapel


# ---------------------------------------------------------------------------
# Choirs
# ---------------------------------------------------------------------------


def _to_choir_record(choir: Choir, chapel: Optional[Chapel]) -> ChoirRecord:
    return ChoirRecord(
        id=choir.id,
        name=choir.name,
        chapel_id=choir.chapel_id,
        chapel_code=chapel.code if chapel else None,
        leader_name=choir.leader_name,
        leader_email=choir.leader_email,
        status=RequestStatus(choir.status),
        created_at=choir.created_at,
    )


def list_choirs(
    db: Session,
    chapel_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[List[ChoirRecord], int]:
    """List choirs with optional chapel/status filters, plus the unpaginated total."""
    stmt = select(Choir, Chapel).join(Chapel, Chapel.id == Choir.chapel_id).order_by(Choir.created_at.desc(), Choir.id)
    if chapel_id is not None:
        get_chapel_or_404(db, chapel_id)
        stmt = stmt.where(Choir.chapel_id == chapel_id)
    if status_filter:
        try:
            normalised = RequestStatus(status_filter.upper())
        except ValueError as exc:
            raise ServiceError(
                f"status must be one of {[s.value for s in RequestStatus]}", status_code=422
            ) from exc
        stmt = stmt.where(Choir.status == normalised.value)

    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    rows = db.execute(stmt.limit(limit).offset(offset)).all()
    return [_to_choir_record(choir, chapel) for choir, chapel in rows], int(total)


def create_choir(db: Session, payload: Dict[str, Any]) -> ChoirRecord:
    """Create a choir in PENDING state."""
    chapel = get_chapel_or_404(db, payload["chapel_id"])
    choir = Choir(
        name=payload["name"].strip(),
        chapel_id=chapel.id,
        leader_name=payload["leader_name"].strip(),
        leader_email=str(payload["leader_email"]).lower(),
        status=RequestStatus.PENDING.value,
    )
    db.add(choir)
    db.commit()
    db.refresh(choir)
    log.info("Choir %d created (%s) in chapel %s.", choir.id, choir.name, chapel.code)
    return _to_choir_record(choir, chapel)


def set_choir_status(db: Session, choir_id: int, status: RequestStatus) -> ChoirRecord:
    """Update the approval status of a choir."""
    choir = db.get(Choir, choir_id)
    if choir is None:
        raise ServiceError("Choir not found", status_code=404)
    choir.status = status.value
    db.commit()
    db.refresh(choir)
    return _to_choir_record(choir, db.get(Chapel, choir.chapel_id))


# ---------------------------------------------------------------------------
# Mass schedules
# ---------------------------------------------------------------------------

_MASS_STMT = (
    select(MassSchedule, Chapel, Choir)
    .join(Chapel, Chapel.id == MassSchedule.chapel_id)
    .outerjoin(Choir, Choir.id == MassSchedule.choir_id)
    .order_by(MassSchedule.mass_date, MassSchedule.mass_time, MassSchedule.id)
)


def _to_mass_record(mass: MassSchedule, chapel: Chapel, choir: Optional[Choir]) -> MassScheduleRecord:
    return MassScheduleRecord(
        id=mass.id,
        chapel_id=chapel.id,
        chapel=chapel.name,
        chapel_code=chapel.code,
        choir_id=choir.id if choir else None,
        choir=choir.name if choir else None,
        mass_date=mass.mass_date,
        mass_time=mass.mass_time,
        title=mass.title,
        liturgical_color=mass.liturgical_color,
        created_at=mass.created_at,
    )


def list_masses(
    db: Session,
    chapel_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: int = 100,
    offset: int = 0,
) -> tuple[List[MassScheduleRecord], int]:
    """List mass schedules, optionally scoped to a chapel and a date window."""
    stmt = _MASS_STMT
    if chapel_id is not None:
        get_chapel_or_404(db, chapel_id)
        stmt = stmt.where(MassSchedule.chapel_id == chapel_id)
    if start_date is not None:
        stmt = stmt.where(MassSchedule.mass_date >= start_date)
    if end_date is not None:
        stmt = stmt.where(MassSchedule.mass_date <= end_date)

    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    rows = db.execute(stmt.limit(limit).offset(offset)).all()
    return [_to_mass_record(mass, chapel, choir) for mass, chapel, choir in rows], int(total)


def create_mass(db: Session, payload: MassScheduleCreate) -> MassScheduleRecord:
    """Create a mass schedule entry and return the freshly persisted row."""
    chapel = get_chapel_or_404(db, payload.chapel_id)

    choir: Optional[Choir] = None
    if payload.choir_id is not None:
        choir = db.get(Choir, payload.choir_id)
        if choir is None:
            raise ServiceError("Choir not found", status_code=404)
        if choir.chapel_id != chapel.id:
            raise ServiceError("The choir does not belong to the selected chapel", status_code=422)

    mass = MassSchedule(
        chapel_id=chapel.id,
        choir_id=choir.id if choir else None,
        mass_date=payload.mass_date,
        mass_time=payload.mass_time,
        title=payload.title.strip(),
        liturgical_color=payload.liturgical_color,
    )
    db.add(mass)
    db.commit()
    db.refresh(mass)
    log.info("Mass #%d scheduled for %s at %s.", mass.id, chapel.code, mass.mass_date)
    return _to_mass_record(mass, chapel, choir)


def delete_mass(db: Session, mass_id: int) -> None:
    """Delete a mass schedule entry."""
    mass = db.get(MassSchedule, mass_id)
    if mass is None:
        raise ServiceError("Mass schedule not found", status_code=404)
    db.delete(mass)
    db.commit()


# ---------------------------------------------------------------------------
# Membership requests
# ---------------------------------------------------------------------------


def _to_membership_record(
    request: MembershipRequest, chapel: Optional[Chapel]
) -> MembershipRequestRecord:
    return MembershipRequestRecord(
        id=request.id,
        full_name=request.full_name,
        choir_name=request.choir_name,
        chapel_id=request.chapel_id,
        chapel_name=chapel.name if chapel else None,
        status=RequestStatus(request.status),
        submitted_at=request.submitted_at,
        reviewed_by=request.reviewed_by,
        reviewed_at=request.reviewed_at,
    )


_MEMBERSHIP_STMT = (
    select(MembershipRequest, Chapel)
    .join(Chapel, Chapel.id == MembershipRequest.chapel_id)
    .order_by(MembershipRequest.submitted_at.desc(), MembershipRequest.id.desc())
)


def create_membership_request(
    db: Session, payload: MembershipRequestCreate
) -> MembershipRequestRecord:
    """Submit a choir membership request, always stored as PENDING."""
    chapel = get_chapel_or_404(db, payload.chapel_id)
    request = MembershipRequest(
        full_name=payload.full_name.strip(),
        choir_name=payload.choir_name.strip(),
        chapel_id=chapel.id,
        status=RequestStatus.PENDING.value,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    log.info("Membership request #%d received from %s.", request.id, request.full_name)
    return _to_membership_record(request, chapel)


def list_membership_requests(
    db: Session,
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[List[MembershipRequestRecord], int]:
    """List membership requests, newest first."""
    stmt = _MEMBERSHIP_STMT
    if status_filter:
        try:
            normalised = RequestStatus(status_filter.upper())
        except ValueError as exc:
            raise ServiceError(
                f"status must be one of {[s.value for s in RequestStatus]}", status_code=422
            ) from exc
        stmt = stmt.where(MembershipRequest.status == normalised.value)

    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    rows = db.execute(stmt.limit(limit).offset(offset)).all()
    return [_to_membership_record(request, chapel) for request, chapel in rows], int(total)


def review_membership_request(
    db: Session,
    request_id: int,
    approve: bool,
    reviewer_id: Optional[int],
    reason: Optional[str] = None,
) -> MembershipRequestRecord:
    """Approve or reject a pending request.

    On approval the matching choir is created (or revived) in APPROVED state and
    a leader account is provisioned, which is what makes the request actionable
    rather than merely a status flip.
    """
    request = db.get(MembershipRequest, request_id)
    if request is None:
        raise ServiceError("Membership request not found", status_code=404)
    if request.status != RequestStatus.PENDING.value:
        raise ServiceError(
            f"Only PENDING requests can be reviewed (current status: {request.status})",
            status_code=409,
        )
    if not approve and not (reason or "").strip():
        raise ServiceError("A rejection reason is required", status_code=422)

    chapel = db.get(Chapel, request.chapel_id)

    if approve:
        request.status = RequestStatus.APPROVED.value
        leader_email = _leader_email_for(request.full_name, request.choir_name)
        choir = db.scalar(
            select(Choir).where(
                Choir.chapel_id == request.chapel_id,
                func.lower(Choir.name) == request.choir_name.lower(),
            )
        )
        if choir is None:
            choir = Choir(
                name=request.choir_name,
                chapel_id=request.chapel_id,
                leader_name=request.full_name,
                leader_email=leader_email,
                status=RequestStatus.APPROVED.value,
            )
            db.add(choir)
            db.flush()
        else:
            choir.status = RequestStatus.APPROVED.value

        if not db.scalar(select(User).where(User.email == leader_email)):
            db.add(
                User(
                    full_name=request.full_name,
                    email=leader_email,
                    password_hash=hash_password(_temporary_password()),
                    role=Role.CHOIR_LEADER.value,
                    choir_id=choir.id,
                )
            )
    else:
        request.status = RequestStatus.REJECTED.value

    request.reviewed_by = reviewer_id
    request.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(request)
    log.info("Membership request #%d -> %s by reviewer %s.", request_id, request.status, reviewer_id)
    return _to_membership_record(request, chapel)


def _leader_email_for(full_name: str, choir_name: str) -> str:
    """Derive a deterministic, unique placeholder address for a new choir leader."""
    slug = re.sub(r"[^a-z0-9]+", ".", choir_name.lower()).strip(".") or "chorale"
    return f"responsable.{slug}@parokia.org"


def _temporary_password() -> str:
    """Generate a random password that must be rotated on first login."""
    import secrets

    return f"Parokia-{secrets.token_urlsafe(12)}"


# ---------------------------------------------------------------------------
# Liturgical theme
# ---------------------------------------------------------------------------


def get_theme(db: Session) -> LiturgicalThemeRecord:
    """Return the active liturgical theme, creating the row on first access."""
    setting = db.scalar(select(LiturgicalSetting).order_by(LiturgicalSetting.id).limit(1))
    if setting is None:
        setting = LiturgicalSetting(
            current_color=DEFAULT_THEME_COLOR, active_season=DEFAULT_THEME_SEASON
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return LiturgicalThemeRecord.model_validate(setting)


def update_theme(
    db: Session, color_code: str, season_name: str, updated_by: Optional[int]
) -> LiturgicalThemeRecord:
    """Persist a new accent colour and season label."""
    setting = db.scalar(select(LiturgicalSetting).order_by(LiturgicalSetting.id).limit(1))
    if setting is None:
        setting = LiturgicalSetting()
        db.add(setting)
    setting.current_color = normalize_color(color_code)
    setting.active_season = season_name.strip()
    setting.updated_by = updated_by
    setting.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(setting)
    log.info("Liturgical theme set to %s / %s.", setting.current_color, setting.active_season)
    return LiturgicalThemeRecord.model_validate(setting)


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


def create_user(
    db: Session,
    full_name: str,
    email: str,
    password: str,
    role: Role = Role.PUBLIC,
    choir_id: Optional[int] = None,
) -> UserRecord:
    """Create a user account, rejecting duplicate e-mails."""
    normalised_email = email.strip().lower()
    if db.scalar(select(User).where(func.lower(User.email) == normalised_email)):
        raise ServiceError("Email already registered", status_code=409)
    if choir_id is not None and db.get(Choir, choir_id) is None:
        raise ServiceError("Choir not found", status_code=404)

    user = User(
        full_name=full_name.strip(),
        email=normalised_email,
        password_hash=hash_password(password),
        role=role.value,
        choir_id=choir_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log.info("User %s created with role %s.", user.email, user.role)
    return UserRecord(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=Role(user.role),
        choir_id=user.choir_id,
        created_at=user.created_at,
    )


def authenticate(db: Session, email: str, password: str) -> Optional[User]:
    """Return the user when the credentials match, otherwise ``None``."""
    user = db.scalar(select(User).where(func.lower(User.email) == email.strip().lower()))
    if user is None:
        return None
    from .security import verify_password

    if not verify_password(password, user.password_hash):
        return None
    return user


# ---------------------------------------------------------------------------
# Auto-assignment (shared by the MCP tool and the REST planner endpoint)
# ---------------------------------------------------------------------------


def auto_assign_choirs(db: Session, chapel_id: int, month: int, year: int) -> List[Dict[str, Any]]:
    """Build a deterministic round-robin draft rotation for one chapel and month.

    The rotation depends only on the month index, so re-running the planner for
    the same month always yields the same schedule — an agent can safely retry.
    """
    if not 1 <= month <= 12:
        raise ServiceError("month must be between 1 and 12", status_code=422)
    if year < 2000 or year > 2999:
        raise ServiceError("year must be between 2000 and 2999", status_code=422)

    chapel = get_chapel_or_404(db, chapel_id)
    approved = db.scalars(
        select(Choir)
        .where(Choir.chapel_id == chapel_id, Choir.status == RequestStatus.APPROVED.value)
        .order_by(Choir.id)
    ).all()

    if approved:
        rotation: Sequence[str] = [choir.name for choir in approved]
        assignment = rotation[(month - 1) % len(rotation)]
        choir_id: Optional[int] = approved[(month - 1) % len(approved)].id
        confident = True
    else:
        assignment = "Rotation à confirmer"
        choir_id = None
        confident = False

    return [
        {
            "chapel": chapel.name,
            "chapel_code": chapel.code,
            "chapel_id": chapel.id,
            "month": month,
            "year": year,
            "choir": assignment,
            "choir_id": choir_id,
            "approved_choirs": len(approved),
            "reliable": confident,
            "note": "Draft — subject to pastoral validation",
        }
    ]


__all__ = [
    "ServiceError",
    "authenticate",
    "auto_assign_choirs",
    "create_choir",
    "create_mass",
    "create_membership_request",
    "create_user",
    "delete_mass",
    "get_chapel_or_404",
    "get_theme",
    "list_chapels",
    "list_choirs",
    "list_masses",
    "list_membership_requests",
    "normalize_color",
    "review_membership_request",
    "set_choir_status",
    "update_theme",
]
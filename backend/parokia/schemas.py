"""Pydantic v2 request and response models.

Validation is intentionally strict: unknown fields are rejected, strings are
trimmed, and every enum-like value is constrained, so malformed payloads fail at
the edge instead of reaching the database.
"""

from __future__ import annotations

from datetime import date, datetime, time
from enum import Enum
from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------


class Role(str, Enum):
    ADMIN = "ADMIN"
    CHOIR_LEADER = "CHOIR_LEADER"
    PUBLIC = "PUBLIC"


class RequestStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


# ---------------------------------------------------------------------------
# Shared mixins
# ---------------------------------------------------------------------------


class StrictModel(BaseModel):
    """Base model that forbids unknown keys and trims incoming strings."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, from_attributes=True)

    @field_validator("*", mode="after")
    @classmethod
    def _reject_blank_strings(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            raise ValueError("must not be blank")
        return value


class ORMModel(BaseModel):
    """Base model able to validate directly from ORM instances."""

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Generic envelope
# ---------------------------------------------------------------------------

T = TypeVar("T")


class PageMeta(BaseModel):
    total: int = Field(ge=0)
    limit: int = Field(ge=1)
    offset: int = Field(ge=0)


class Page(BaseModel, Generic[T]):
    """Envelope returned by every list endpoint for predictable client pagination."""

    items: List[T]
    meta: PageMeta

    @classmethod
    def build(cls, items: List[T], total: int, limit: int, offset: int) -> "Page[T]":
        return cls(items=items, meta=PageMeta(total=total, limit=limit, offset=offset))


# ---------------------------------------------------------------------------
# System
# ---------------------------------------------------------------------------


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: str
    database: str
    database_status: str
    timestamp: datetime


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


class UserCreate(StrictModel):
    """Public self-registration payload. The role is always PUBLIC."""

    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserCreateByAdmin(UserCreate):
    """Administrative payload able to assign a role and attach a choir."""

    role: Role = Role.PUBLIC
    choir_id: Optional[int] = Field(default=None, gt=0)


class UserRecord(ORMModel):
    id: int
    full_name: str
    email: EmailStr
    role: Role
    choir_id: Optional[int] = None
    created_at: datetime


class LoginRequest(BaseModel):
    """JSON login alternative to the OAuth2 password form."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Access token lifetime in seconds")
    role: Role


# ---------------------------------------------------------------------------
# Chapels
# ---------------------------------------------------------------------------


class ChapelRecord(ORMModel):
    id: int
    name: str
    code: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    created_at: Optional[datetime] = None


class ChapelUpsert(StrictModel):
    name: str = Field(min_length=2, max_length=100)
    code: str = Field(min_length=2, max_length=20)
    description: Optional[str] = Field(default=None, max_length=1000)
    image_url: Optional[str] = Field(default=None, max_length=2000)


# ---------------------------------------------------------------------------
# Choirs
# ---------------------------------------------------------------------------


class ChoirCreate(StrictModel):
    name: str = Field(min_length=2, max_length=150)
    chapel_id: int = Field(gt=0)
    leader_name: str = Field(min_length=2, max_length=150)
    leader_email: EmailStr


class ChoirStatusUpdate(StrictModel):
    status: RequestStatus


class ChoirRecord(ORMModel):
    id: int
    name: str
    chapel_id: int
    chapel_code: Optional[str] = None
    leader_name: str
    leader_email: EmailStr
    status: RequestStatus
    created_at: datetime


# ---------------------------------------------------------------------------
# Membership requests
# ---------------------------------------------------------------------------


class MembershipRequestCreate(StrictModel):
    """Strictly the three fields mandated by the choir-leader onboarding form."""

    full_name: str = Field(min_length=2, max_length=150)
    choir_name: str = Field(min_length=2, max_length=150)
    chapel_id: int = Field(gt=0)


class MembershipRequestRecord(ORMModel):
    id: int
    full_name: str
    choir_name: str
    chapel_id: int
    chapel_name: Optional[str] = None
    status: RequestStatus
    submitted_at: datetime
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None


class MembershipReview(StrictModel):
    action: str = Field(pattern="^(approve|reject)$")
    reason: Optional[str] = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def _reason_required_on_reject(self) -> "MembershipReview":
        if self.action == "reject" and not (self.reason or "").strip():
            raise ValueError("a rejection reason is required")
        return self


# ---------------------------------------------------------------------------
# Mass schedules
# ---------------------------------------------------------------------------


HEX_COLOR_PATTERN = r"^#[0-9A-Fa-f]{6}$"


class MassScheduleCreate(StrictModel):
    chapel_id: int = Field(gt=0)
    choir_id: Optional[int] = Field(default=None, gt=0)
    mass_date: date
    mass_time: time
    title: str = Field(min_length=2, max_length=200)
    liturgical_color: str = Field(pattern=HEX_COLOR_PATTERN)

    @field_validator("liturgical_color")
    @classmethod
    def _uppercase_color(cls, value: str) -> str:
        return value.upper()


class MassScheduleRecord(ORMModel):
    id: int
    chapel_id: int
    chapel: str
    chapel_code: Optional[str] = None
    choir_id: Optional[int] = None
    choir: Optional[str] = None
    mass_date: date
    mass_time: time
    title: str
    liturgical_color: str
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Liturgical theme
# ---------------------------------------------------------------------------


class LiturgicalThemeUpdate(StrictModel):
    color_code: str = Field(pattern=HEX_COLOR_PATTERN)
    season_name: str = Field(min_length=2, max_length=100)

    @field_validator("color_code")
    @classmethod
    def _uppercase_color(cls, value: str) -> str:
        return value.upper()


class LiturgicalThemeRecord(ORMModel):
    id: int
    current_color: str
    active_season: str
    updated_at: datetime
    updated_by: Optional[int] = None


__all__ = [
    "ChapelRecord",
    "ChapelUpsert",
    "ChoirCreate",
    "ChoirRecord",
    "ChoirStatusUpdate",
    "HealthResponse",
    "LiturgicalThemeRecord",
    "LiturgicalThemeUpdate",
    "LoginRequest",
    "MassScheduleCreate",
    "MassScheduleRecord",
    "MembershipRequestCreate",
    "MembershipRequestRecord",
    "MembershipReview",
    "Page",
    "PageMeta",
    "RequestStatus",
    "Role",
    "TokenResponse",
    "UserCreate",
    "UserCreateByAdmin",
    "UserRecord",
]

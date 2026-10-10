"""SQLAlchemy 2.x ORM models mirroring ``backend/schema.sql``.

Every model is expressed with ``Mapped`` / ``mapped_column`` so the schema stays
typed, and the CHECK constraints declared in the PostgreSQL DDL are reproduced
here for the SQLite development database.
"""

from __future__ import annotations

from datetime import date, datetime, time, timezone
from typing import List, Optional

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Time,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

ChoirStatus = SAEnum("PENDING", "APPROVED", "REJECTED", name="choir_status", native_enum=False)
UserRole = SAEnum("ADMIN", "CHOIR_LEADER", "PUBLIC", name="user_role", native_enum=False)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class Chapel(Base):
    """One of the eight chapel communities of Notre-Dame d'Afrique parish."""

    __tablename__ = "chapels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    choirs: Mapped[List["Choir"]] = relationship(
        back_populates="chapel", cascade="all, delete-orphan", passive_deletes=True
    )
    mass_schedules: Mapped[List["MassSchedule"]] = relationship(
        back_populates="chapel", cascade="all, delete-orphan", passive_deletes=True
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging helper
        return f"<Chapel id={self.id} code={self.code!r} name={self.name!r}>"


class Choir(Base):
    """A choral group affiliated with a chapel, owned by a choir leader."""

    __tablename__ = "choirs"
    __table_args__ = (
        Index("idx_choirs_chapel_status", "chapel_id", "status"),
        CheckConstraint(
            "status IN ('PENDING', 'APPROVED', 'REJECTED')", name="ck_choirs_status"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    chapel_id: Mapped[int] = mapped_column(
        ForeignKey("chapels.id", ondelete="CASCADE"), nullable=False
    )
    leader_name: Mapped[str] = mapped_column(String(150), nullable=False)
    leader_email: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        ChoirStatus, default="PENDING", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    chapel: Mapped["Chapel"] = relationship(back_populates="choirs")
    users: Mapped[List["User"]] = relationship(back_populates="choir")

    def __repr__(self) -> str:  # pragma: no cover - debugging helper
        return f"<Choir id={self.id} name={self.name!r} status={self.status!r}>"


class User(Base):
    """Platform account. Passwords are stored as Bcrypt hashes only."""

    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('ADMIN', 'CHOIR_LEADER', 'PUBLIC')", name="ck_users_role"),
        Index("idx_users_email", "email"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(UserRole, default="PUBLIC", nullable=False)
    choir_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("choirs.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    choir: Mapped[Optional["Choir"]] = relationship(back_populates="users")

    def __repr__(self) -> str:  # pragma: no cover - debugging helper
        return f"<User id={self.id} email={self.email!r} role={self.role!r}>"


class MassSchedule(Base):
    """A scheduled Mass celebration linked to a chapel and optionally a choir."""

    __tablename__ = "mass_schedules"
    __table_args__ = (
        Index("idx_mass_schedules_chapel_date", "chapel_id", "mass_date"),
        Index("idx_mass_schedules_date_time", "mass_date", "mass_time"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    chapel_id: Mapped[int] = mapped_column(
        ForeignKey("chapels.id", ondelete="CASCADE"), nullable=False
    )
    choir_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("choirs.id", ondelete="SET NULL"), nullable=True
    )
    mass_date: Mapped[date] = mapped_column(Date, nullable=False)
    mass_time: Mapped[time] = mapped_column(Time, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    liturgical_color: Mapped[str] = mapped_column(String(30), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    chapel: Mapped["Chapel"] = relationship(back_populates="mass_schedules")
    choir: Mapped[Optional["Choir"]] = relationship()

    def __repr__(self) -> str:  # pragma: no cover - debugging helper
        return f"<MassSchedule id={self.id} date={self.mass_date} time={self.mass_time}>"


class MembershipRequest(Base):
    """Public choir-membership form submission awaiting an ADMIN review."""

    __tablename__ = "membership_requests"
    __table_args__ = (
        Index("idx_membership_requests_status", "status"),
        Index("idx_membership_requests_chapel", "chapel_id"),
        CheckConstraint(
            "status IN ('PENDING', 'APPROVED', 'REJECTED')", name="ck_membership_requests_status"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    choir_name: Mapped[str] = mapped_column(String(150), nullable=False)
    chapel_id: Mapped[int] = mapped_column(
        ForeignKey("chapels.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        ChoirStatus, default="PENDING", nullable=False
    )
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
    reviewed_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    chapel: Mapped["Chapel"] = relationship()

    def __repr__(self) -> str:  # pragma: no cover - debugging helper
        return f"<MembershipRequest id={self.id} choir={self.choir_name!r} status={self.status!r}>"


class LiturgicalSetting(Base):
    """Single-row table holding the active liturgical accent colour and season."""

    __tablename__ = "liturgical_settings"

    # The DDL mandates SERIAL for parity with the PostgreSQL script, so the
    # single-row invariant is enforced in parokia.services instead of by a CHECK.
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    current_color: Mapped[str] = mapped_column(
        String(30), default="#0284C7", nullable=False
    )
    active_season: Mapped[str] = mapped_column(
        String(100), default="Fêtes mariales", nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )
    updated_by: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging helper
        return f"<LiturgicalSetting color={self.current_color!r} season={self.active_season!r}>"


__all__ = [
    "Base",
    "Chapel",
    "Choir",
    "ChoirStatus",
    "LiturgicalSetting",
    "MassSchedule",
    "MembershipRequest",
    "User",
    "UserRole",
]

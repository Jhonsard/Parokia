"""Pydantic schema validation tests (no database required)."""

from __future__ import annotations

from datetime import date, time

import pytest
from pydantic import ValidationError

from parokia.schemas import (
    ChapelUpsert,
    MembershipReview,
    MembershipRequestCreate,
    MassScheduleCreate,
    UserCreate,
    UserCreateByAdmin,
)


class TestChapelUpsert:
    def test_valid(self) -> None:
        chapel = ChapelUpsert(name="TUNGANE", code="TGN", description="Se rassembler")
        assert chapel.name == "TUNGANE"

    def test_rejects_short_code(self) -> None:
        with pytest.raises(ValidationError):
            ChapelUpsert(name="TUNGANE", code="T", description="x")

    def test_rejects_unknown_field(self) -> None:
        with pytest.raises(ValidationError):
            ChapelUpsert(name="TUNGANE", code="TGN", extra="boom")


class TestMembershipRequest:
    def test_valid(self) -> None:
        req = MembershipRequestCreate(
            full_name="Alice Nsimba", choir_name="Chorale Amani", chapel_id=3
        )
        assert req.chapel_id == 3

    def test_rejects_empty_name(self) -> None:
        with pytest.raises(ValidationError):
            MembershipRequestCreate(full_name="   ", choir_name="x", chapel_id=1)

    def test_rejects_zero_chapel(self) -> None:
        with pytest.raises(ValidationError):
            MembershipRequestCreate(full_name="Alice", choir_name="x", chapel_id=0)


class TestMassSchedule:
    def test_valid_lowercases_color(self) -> None:
        mass = MassScheduleCreate(
            chapel_id=1,
            mass_date=date(2026, 10, 5),
            mass_time=time(8, 0),
            title="Messe dominicale",
            liturgical_color="#0284c7",
        )
        assert mass.liturgical_color == "#0284C7"

    def test_rejects_bad_color(self) -> None:
        with pytest.raises(ValidationError):
            MassScheduleCreate(
                chapel_id=1,
                mass_date=date.today(),
                mass_time=time(8, 0),
                title="x",
                liturgical_color="red",
            )


class TestMembershipReview:
    def test_rejects_reject_without_reason(self) -> None:
        with pytest.raises(ValidationError):
            MembershipReview(action="reject")

    def test_approve_ignores_reason(self) -> None:
        review = MembershipReview(action="approve")
        assert review.reason is None


class TestUserCreate:
    def test_strips_whitespace(self) -> None:
        user = UserCreate(full_name="  Alice  ", email="  a@b.org  ", password="long-enough")
        assert user.full_name == "Alice"
        assert user.email == "a@b.org"

    def test_admin_can_set_role(self) -> None:
        admin = UserCreateByAdmin(
            full_name="Bob", email="bob@parokia.org", password="long-password", role="CHOIR_LEADER"
        )
        assert admin.role.value == "CHOIR_LEADER"

    def test_rejects_short_password(self) -> None:
        with pytest.raises(ValidationError):
            UserCreate(full_name="Alice", email="a@b.org", password="short")

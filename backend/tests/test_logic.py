"""Logic tests for pure helpers that do not touch the database."""

from __future__ import annotations

import re

import pytest


HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


def normalize_color(color_code: str) -> str:
    """Mirror of parokia.services.normalize_color for offline verification."""
    if not HEX_COLOR_RE.match(color_code):
        raise ValueError("color_code must be a hex string such as #0284C7")
    return color_code.upper()


def rotate(items: list[str], month: int) -> str:
    """Mirror of the round-robin in parokia.services.auto_assign_choirs."""
    return items[(month - 1) % len(items)]


class TestColorNormalization:
    @pytest.mark.parametrize(
        "raw, expected",
        [
            ("#0284c7", "#0284C7"),
            ("#eab308", "#EAB308"),
            ("#16A34A", "#16A34A"),
        ],
    )
    def test_uppercase_and_validate(self, raw: str, expected: str) -> None:
        assert normalize_color(raw) == expected

    @pytest.mark.parametrize(
        "bad",
        ["0284C7", "#GGGGGG", "#12345", "#1234567", "", " ", "##0284C7"],
    )
    def test_rejects_invalid(self, bad: str) -> None:
        with pytest.raises(ValueError):
            normalize_color(bad)


class TestRoundRobin:
    def test_wraps_at_boundary(self) -> None:
        choirs = ["A", "B", "C"]
        assert rotate(choirs, 1) == "A"
        assert rotate(choirs, 3) == "C"
        assert rotate(choirs, 4) == "A"

    def test_months_map_deterministically(self) -> None:
        choirs = ["Alpha", "Beta", "Gamma", "Delta"]
        assert rotate(choirs, 12) == "Delta"
        assert rotate(choirs, 13) == "Alpha"
        assert rotate(choirs, 0) == "Delta"  # month-1 == -1 wraps in Python

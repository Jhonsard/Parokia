"""Liturgical theme endpoints driving the CSS ``--accent-color`` variable."""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import LiturgicalThemeRecord, LiturgicalThemeUpdate, UserRecord
from ..security import require_admin
from ..services import auto_assign_choirs, get_theme, update_theme

router = APIRouter(prefix="/api/liturgical-theme", tags=["Liturgical theme"])


@router.get("", response_model=LiturgicalThemeRecord, summary="Active liturgical theme (public)")
def read_theme(db: Session = Depends(get_db)) -> LiturgicalThemeRecord:
    """Return the accent colour and season currently in force."""
    return get_theme(db)


@router.patch(
    "",
    response_model=LiturgicalThemeRecord,
    summary="Update the liturgical theme (ADMIN)",
)
def patch_theme(
    payload: LiturgicalThemeUpdate,
    current: UserRecord = Depends(require_admin),
    db: Session = Depends(get_db),
) -> LiturgicalThemeRecord:
    """Change the accent colour and season label."""
    return update_theme(db, payload.color_code, payload.season_name, current.id)


# ---------------------------------------------------------------------------
# Liturgical palette — the five colours mandated by the parish design charter
# ---------------------------------------------------------------------------

LITURGICAL_PALETTE: list[Dict[str, Any]] = [
    {
        "id": "marian",
        "label": "Bleu ciel",
        "color": "#0284C7",
        "hover": "#0369A1",
        "season": "Fêtes mariales",
        "occasion": "Fêtes mariales — couleur paroissiale par défaut",
    },
    {
        "id": "ordinary",
        "label": "Vert",
        "color": "#16A34A",
        "hover": "#15803D",
        "season": "Temps ordinaire",
        "occasion": "Temps Ordinaire",
    },
    {
        "id": "advent",
        "label": "Violet",
        "color": "#7C3AED",
        "hover": "#6D28D9",
        "season": "Avent et Carême",
        "occasion": "Avent, Carême — temps de pénitence et d'attente",
    },
    {
        "id": "martyrs",
        "label": "Rouge",
        "color": "#DC2626",
        "hover": "#B91C1C",
        "season": "Fêtes des martyrs",
        "occasion": "Rameaux, Vendredi Saint, Pentecôte, Fêtes des Martyrs",
    },
    {
        "id": "paschal",
        "label": "Jaune doré",
        "color": "#EAB308",
        "hover": "#CA8A04",
        "season": "Noël et Temps Pascal",
        "occasion": "Noël, Pâques, solennités du Seigneur",
    },
]


@router.get("/palette", tags=["Liturgical theme"], summary="Liturgical colour palette")
def read_palette() -> list[Dict[str, Any]]:
    """Expose the five configurable accent colours so the client never hardcodes them."""
    return LITURGICAL_PALETTE


@router.get("/planner", tags=["Liturgical theme"], summary="Draft choir rotation")
def read_planner(
    chapel_id: int,
    month: int,
    year: int,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Return the deterministic draft rotation for one chapel and month.

    Read-only counterpart of the ``auto_assign_choirs`` MCP tool, so a browser can
    preview a rotation before an agent commits it.
    """
    return {"ok": True, "assignments": auto_assign_choirs(db, chapel_id, month, year)}
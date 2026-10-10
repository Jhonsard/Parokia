"""FastMCP automation server for the Parokia parish platform.

Runs over stdio (``python -m parokia.mcp_server``) and is deliberately separate
from the FastAPI process: agents speak MCP, browsers speak REST, and neither
blocks the other.

Every tool delegates to :mod:`parokia.services`, so an automation action and the
equivalent REST call can never diverge.
"""

from __future__ import annotations

import json
import logging
from contextlib import contextmanager
from datetime import date, datetime
from typing import Any, Dict, Iterator, List

from mcp.server.fastmcp import FastMCP
from sqlalchemy.orm import Session

from .database import SessionLocal
from .schemas import RequestStatus
from .seed import run_seed
from .services import (
    ServiceError,
    auto_assign_choirs,
    list_chapels,
    list_masses,
    list_membership_requests,
    normalize_color,
    review_membership_request,
    update_theme,
)

log = logging.getLogger("parokia.mcp")

mcp = FastMCP("parokia-automation")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


@contextmanager
def _session() -> Iterator[Session]:
    """Yield a database session, rolling back on any failure."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _ok(**payload: Any) -> str:
    """Serialise a successful tool result."""
    return json.dumps({"ok": True, **payload}, ensure_ascii=False, default=str)


def _fail(message: str, **payload: Any) -> str:
    """Serialise a failed tool result.

    Failures are returned as data rather than raised, because an agent can react
    to a structured error far more reliably than to a transport-level exception.
    """
    log.warning("MCP tool failure: %s", message)
    return json.dumps({"ok": False, "error": message, **payload}, ensure_ascii=False, default=str)


def _ensure_schema() -> None:
    """Create and seed the database on first use so stdio MCP works standalone."""
    run_seed()


# ---------------------------------------------------------------------------
# Resources
# ---------------------------------------------------------------------------


@mcp.resource("parish://masses/schedule")
def parish_mass_schedule() -> str:
    """Mass schedules across all chapels, ordered by date then time."""
    _ensure_schema()
    with _session() as db:
        items, total = list_masses(db, limit=500)
    return json.dumps(
        {
            "total": total,
            "masses": [item.model_dump(mode="json") for item in items],
        },
        ensure_ascii=False,
        default=str,
    )


@mcp.resource("parish://membership/pending")
def pending_membership_requests() -> str:
    """Choir membership requests still awaiting a decision."""
    _ensure_schema()
    with _session() as db:
        items, total = list_membership_requests(db, status_filter=RequestStatus.PENDING.value, limit=200)
    return json.dumps(
        {
            "total": total,
            "requests": [item.model_dump(mode="json") for item in items],
        },
        ensure_ascii=False,
        default=str,
    )


@mcp.resource("parish://chapels")
def parish_chapels() -> str:
    """The eight chapel communities with their mnemonic codes."""
    _ensure_schema()
    with _session() as db:
        chapels = list_chapels(db)
    return json.dumps(
        {"total": len(chapels), "chapels": [c.model_dump(mode="json") for c in chapels]},
        ensure_ascii=False,
    )


@mcp.resource("parish://liturgical-theme")
def parish_liturgical_theme() -> str:
    """Current accent colour and liturgical season."""
    _ensure_schema()
    with _session() as db:
        from .services import get_theme

        theme = get_theme(db)
    return json.dumps(theme.model_dump(mode="json"), ensure_ascii=False, default=str)


@mcp.resource("parish://choirs/approved")
def parish_approved_choirs() -> str:
    """Every APPROVED choir, grouped by chapel code."""
    _ensure_schema()
    with _session() as db:
        from sqlalchemy import select

        from .models import Chapel, Choir

        rows = db.execute(
            select(Choir, Chapel)
            .join(Chapel, Chapel.id == Choir.chapel_id)
            .where(Choir.status == RequestStatus.APPROVED.value)
            .order_by(Chapel.id, Choir.id)
        ).all()

    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for choir, chapel in rows:
        grouped.setdefault(chapel.code, []).append(
            {"id": choir.id, "name": choir.name, "leader_name": choir.leader_name}
        )
    return json.dumps({"by_chapel": grouped}, ensure_ascii=False, default=str)


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------


@mcp.tool()
def approve_membership_request(request_id: int, reviewer_id: int) -> str:
    """Approve a pending choir membership request.

    Approving also provisions the choir in APPROVED state plus a leader account,
    so the parish immediately gains an entry it can schedule.

    Args:
        request_id: Database ID of the membership request to approve.
        reviewer_id: Database ID of the admin performing the review.

    Returns:
        JSON with ``ok``, ``request_id``, ``status`` and the created choir.
    """
    _ensure_schema()
    try:
        with _session() as db:
            record = review_membership_request(
                db, request_id=request_id, approve=True, reviewer_id=reviewer_id
            )
            from sqlalchemy import func, select

            from .models import Choir

            choir = db.scalar(
                select(Choir)
                .where(
                    Choir.chapel_id == record.chapel_id,
                    func.lower(Choir.name) == record.choir_name.lower(),
                )
                .limit(1)
            )
            choir_payload = (
                {"id": choir.id, "name": choir.name, "status": choir.status} if choir else None
            )
    except ServiceError as exc:
        return _fail(exc.message, request_id=request_id)
    return _ok(
        request_id=request_id,
        status=RequestStatus.APPROVED.value,
        choir=choir_payload,
        reviewed_by=reviewer_id,
    )


@mcp.tool()
def reject_membership_request(request_id: int, reason: str, reviewer_id: int) -> str:
    """Reject a pending choir membership request with a mandatory reason.

    Args:
        request_id: Database ID of the membership request to reject.
        reason: Justification communicated back to the applicant.
        reviewer_id: Database ID of the admin performing the review.

    Returns:
        JSON with ``ok``, ``request_id``, ``status`` and ``reason``.
    """
    if not (reason or "").strip():
        return _fail("a rejection reason is required", request_id=request_id)
    _ensure_schema()
    try:
        with _session() as db:
            review_membership_request(
                db,
                request_id=request_id,
                approve=False,
                reviewer_id=reviewer_id,
                reason=reason,
            )
    except ServiceError as exc:
        return _fail(exc.message, request_id=request_id)
    return _ok(
        request_id=request_id,
        status=RequestStatus.REJECTED.value,
        reason=reason.strip(),
        reviewed_by=reviewer_id,
    )


@mcp.tool()
def auto_assign_choirs(chapel_id: int, month: int, year: int) -> str:
    """Build a deterministic draft choir rotation for a chapel and calendar month.

    The rotation is a pure function of the month index, so re-running the planner
    for the same month always returns the same schedule.

    Args:
        chapel_id: Database ID of the target chapel.
        month: Calendar month, 1-12.
        year: Calendar year, 2000-2999.

    Returns:
        JSON with ``ok`` and an ``assignments`` list.
    """
    _ensure_schema()
    try:
        with _session() as db:
            assignments = auto_assign_choirs(db, chapel_id, month, year)
    except ServiceError as exc:
        return _fail(exc.message, chapel_id=chapel_id, month=month, year=year)
    return _ok(assignments=assignments)


@mcp.tool()
def update_liturgical_theme(color_code: str, season_name: str, updated_by: int) -> str:
    """Update the parish liturgical accent colour and season label.

    Args:
        color_code: Six-digit hex colour such as ``#7C3AED``.
        season_name: Liturgical season label such as ``Avent``.
        updated_by: Database ID of the admin performing the update.

    Returns:
        JSON with ``ok`` and the persisted ``settings``.
    """
    try:
        color = normalize_color(color_code)
    except ServiceError as exc:
        return _fail(exc.message)
    if not (season_name or "").strip():
        return _fail("season_name is required")

    _ensure_schema()
    try:
        with _session() as db:
            record = update_theme(db, color, season_name, updated_by)
    except ServiceError as exc:
        return _fail(exc.message)
    return _ok(settings=record.model_dump(mode="json"))


@mcp.tool()
def create_mass_schedule(
    chapel_id: int,
    mass_date: str,
    mass_time: str,
    title: str,
    liturgical_color: str = "#0284C7",
    choir_id: int | None = None,
) -> str:
    """Schedule a Mass celebration.

    Args:
        chapel_id: Target chapel.
        mass_date: ISO date, ``YYYY-MM-DD``.
        mass_time: Local time, ``HH:MM`` (24-hour).
        title: Celebration title.
        liturgical_color: Hex accent colour for the celebration.
        choir_id: Optional choir to assign.

    Returns:
        JSON with ``ok`` and the created ``mass``.
    """
    from .schemas import MassScheduleCreate

    _ensure_schema()
    try:
        parsed_date = date.fromisoformat(mass_date)
        parsed_time = datetime.strptime(mass_time, "%H:%M").time()
        payload = MassScheduleCreate(
            chapel_id=chapel_id,
            choir_id=choir_id,
            mass_date=parsed_date,
            mass_time=parsed_time,
            title=title,
            liturgical_color=liturgical_color,
        )
    except ValueError as exc:
        return _fail(f"invalid input: {exc}")

    from .services import create_mass

    try:
        with _session() as db:
            record = create_mass(db, payload)
    except ServiceError as exc:
        return _fail(exc.message)
    return _ok(mass=record.model_dump(mode="json"))


@mcp.tool()
def list_pending_requests(limit: int = 25) -> str:
    """Return pending membership requests without touching their status.

    Args:
        limit: Maximum number of records to return (1-200).

    Returns:
        JSON with ``ok`` and the ``requests`` list.
    """
    _ensure_schema()
    capped = max(1, min(int(limit), 200))
    with _session() as db:
        items, total = list_membership_requests(
            db, status_filter=RequestStatus.PENDING.value, limit=capped
        )
    return _ok(
        total=total,
        requests=[item.model_dump(mode="json") for item in items],
    )


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------


@mcp.prompt()
def generate_sunday_bulletin(mass_date: str) -> str:
    """Draft the Sunday parish bulletin for a given date.

    Args:
        mass_date: Target Sunday in ISO format, ``YYYY-MM-DD``.

    Returns:
        A prompt instructing an LLM to produce the bulletin.
    """
    return (
        f"Rédige le bulletin paroissial dominical du dimanche {mass_date} pour la paroisse "
        "Notre-Dame d'Afrique à Goma. Commence par appeler la ressource parish://masses/schedule "
        "pour obtenir les horaires et les chœurs assignés, ainsi que parish://choirs/approved "
        "pour connaître les responsables. Structure attendue : un titre solennel, une note "
        "pastorale de deux phrases, le programme des messes par chapelle "
        "(TUNGANE, USHINDI, AMANI, MAPENDO, AMKENI, UMOJA, TUNDA, MWANGAZA) avec les horaires "
        "et les chœurs, puis une annonce pratique pour la semaine. Ton institutionnel, ecclésial "
        "et chaleureux, sans cliché. Environ 300 mots, en français."
    )


@mcp.prompt()
def review_pending_requests() -> str:
    """Instruct an agent to triage the choir membership queue."""
    return (
        "Consulte la ressource parish://membership/pending. Pour chaque demande, explique en une "
        "phrase pourquoi elle est cohérente ou non avec la vie paroissiale (chorale déjà existante "
        "avec un nom proche, responsable déjà connu, chapelle correspondante), puis propose une "
        "décision : approuver ou rejeter. N'appelle l'outil approve_membership_request ou "
        "reject_membership_request qu'après avoir justifié ta recommandation, et fournis une "
        "justification claire en cas de rejet. Réponds en français, de façon concise."
    )


__all__ = ["mcp"]


def main() -> None:  # pragma: no cover - process entrypoint
    """Run the MCP server over stdio."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    log.info("Starting Parokia FastMCP server over stdio…")
    mcp.run()


if __name__ == "__main__":  # pragma: no cover
    main()
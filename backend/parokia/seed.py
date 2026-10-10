"""Baseline data seeding.

The seed is idempotent: running it against an already-populated database is a
no-op, which is what makes it safe to call from the FastAPI lifespan and from
every MCP resource.
"""

from __future__ import annotations

import logging
from datetime import date, time

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .database import Base, SessionLocal, engine
from .models import Chapel, Choir, LiturgicalSetting, MassSchedule, MembershipRequest, User
from .schemas import RequestStatus, Role
from .security import hash_password

log = logging.getLogger("parokia.seed")


CHAPELS_SEED: list[tuple[str, str, str]] = [
    ("TUNGANE", "TGN", "Se rassembler"),
    ("USHINDI", "USH", "Victoire"),
    ("AMANI", "AMN", "Paix"),
    ("MAPENDO", "MAP", "Amour"),
    ("AMKENI", "AMK", "Éveiller"),
    ("UMOJA", "UMJ", "Unité"),
    ("TUNDA", "TND", "Porter du fruit"),
    ("MWANGAZA", "MWG", "Lumière"),
]


def create_schema() -> None:
    """Create every table declared by the ORM metadata if it does not exist."""
    Base.metadata.create_all(bind=engine)


def seed_chapels(db: Session) -> dict[str, Chapel]:
    """Insert the eight parish chapels if the table is empty."""
    existing = db.scalars(select(Chapel).order_by(Chapel.id)).all()
    if existing:
        return {chapel.code: chapel for chapel in existing}

    chapels = [
        Chapel(name=name, code=code, description=description)
        for name, code, description in CHAPELS_SEED
    ]
    db.add_all(chapels)
    db.commit()
    log.info("Seeded %d chapels.", len(chapels))
    return {chapel.code: chapel for chapel in db.scalars(select(Chapel).order_by(Chapel.id)).all()}


def seed_admin(db: Session) -> None:
    """Create the bootstrap administrator account."""
    email = settings.bootstrap_admin_email.strip().lower()
    if db.scalar(select(User).where(User.email == email)):
        return
    db.add(
        User(
            full_name="Administration paroissiale",
            email=email,
            password_hash=hash_password(settings.bootstrap_admin_password),
            role=Role.ADMIN.value,
        )
    )
    db.commit()
    log.info("Seeded admin account: %s", email)


def seed_liturgical_theme(db: Session) -> None:
    """Create the single liturgical_settings row."""
    if db.scalar(select(LiturgicalSetting).limit(1)):
        return
    db.add(
        LiturgicalSetting(current_color="#0284C7", active_season="Fêtes mariales")
    )
    db.commit()
    log.info("Seeded liturgical settings (default Marian blue).")


def seed_choirs(db: Session, chapels: dict[str, Chapel]) -> list[Choir]:
    """Insert one approved choir per chapel so the agenda is never empty."""
    if db.scalar(select(Choir).limit(1)):
        return db.scalars(select(Choir).order_by(Choir.id)).all()

    catalogue = [
        ("TGN", "Les Voix de l'Aube", "Grâce Mateso"),
        ("USH", "Schola USHINDI", "Bernadette Kabila"),
        ("AMN", "Harmonie Shalom", "Jean-Pierre Kalonji"),
        ("MAP", "Chœur de l'Avenir", "Esther Mwamba"),
        ("AMK", "Voix de l'Aurore", "Patrick Ilunga"),
        ("UMJ", "Chœur UMOJA", "Claudine Tshibangu"),
        ("TND", "Chorale des Fruits", "Théo Kalala"),
        ("MWG", "Jeunes Voix de Lumière", "Sarah Muteba"),
    ]
    choirs = [
        Choir(
            name=name,
            chapel_id=chapels[code].id,
            leader_name=leader,
            leader_email=f"responsable.{code.lower()}@parokia.org",
            status=RequestStatus.APPROVED.value,
        )
        for code, name, leader in catalogue
    ]
    db.add_all(choirs)
    db.commit()
    log.info("Seeded %d choirs.", len(choirs))
    return db.scalars(select(Choir).order_by(Choir.id)).all()


def seed_mass_schedules(db: Session, chapels: dict[str, Chapel]) -> None:
    """Insert a short, deterministic schedule used by the demo frontend."""
    if db.scalar(select(MassSchedule).limit(1)):
        return

    def _choir_id(code: str) -> int | None:
        choir = db.scalar(select(Choir).where(Choir.chapel_id == chapels[code].id).limit(1))
        return choir.id if choir else None

    schedule = [
        ("TGN", date(2026, 10, 4), time(8, 0), "Messe dominicale", "#0284C7"),
        ("AMN", date(2026, 10, 4), time(10, 30), "Messe des familles", "#EAB308"),
        ("USH", date(2026, 10, 5), time(6, 30), "Messe matinale", "#16A34A"),
        ("UMJ", date(2026, 10, 7), time(17, 30), "Messe en semaine", "#16A34A"),
        ("MWG", date(2026, 10, 11), time(9, 0), "Messe des jeunes", "#0284C7"),
    ]
    db.add_all(
        [
            MassSchedule(
                chapel_id=chapels[code].id,
                choir_id=_choir_id(code),
                mass_date=mass_date,
                mass_time=mass_time,
                title=title,
                liturgical_color=color,
            )
            for code, mass_date, mass_time, title, color in schedule
        ]
    )
    db.commit()
    log.info("Seeded %d mass schedules.", len(schedule))


def seed_membership_requests(db: Session, chapels: dict[str, Chapel]) -> None:
    """Insert one PENDING request so the admin review queue is demonstrable."""
    if db.scalar(select(MembershipRequest).limit(1)):
        return
    db.add(
        MembershipRequest(
            full_name="Alice Nsimba",
            choir_name="Chorale de la Rencontre",
            chapel_id=chapels["MAP"].id,
            status=RequestStatus.PENDING.value,
        )
    )
    db.commit()
    log.info("Seeded 1 pending membership request.")


def run_seed() -> None:
    """Create the schema and populate every baseline dataset."""
    log.info("Seeding database (dialect=%s)…", settings.dialect)
    create_schema()
    with SessionLocal() as db:
        chapels = seed_chapels(db)
        seed_admin(db)
        seed_liturgical_theme(db)
        seed_choirs(db, chapels)
        seed_mass_schedules(db, chapels)
        seed_membership_requests(db, chapels)
    log.info("Database seed complete.")


__all__ = ["create_schema", "run_seed"]
"""Database engine, session factory, and declarative base for Parokia."""

from __future__ import annotations

import logging
from typing import Any, Dict, Generator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings

log = logging.getLogger("parokia.db")


class Base(DeclarativeBase):
    """Declarative base shared by every ORM model."""


def _build_engine() -> Engine:
    kwargs: Dict[str, Any] = settings.engine_kwargs()

    if settings.is_sqlite:
        # An in-memory SQLite database lives inside a single connection, so the
        # pool must hand out one connection to every session (StaticPool).
        # This is what lets the test-suite share a seeded DB across sessions.
        if ":memory:" in settings.database_url or settings.database_url in {"sqlite://", "sqlite:///"}:
            from sqlalchemy.pool import StaticPool

            kwargs["poolclass"] = StaticPool

    engine = create_engine(settings.database_url, **kwargs)

    if settings.is_sqlite:

        @event.listens_for(engine, "connect")
        def _set_sqlite_pragma(dbapi_connection, _connection_record) -> None:  # type: ignore[no-untyped-def]
            """Enforce foreign keys and use WAL so SQLite behaves like a real RDBMS."""
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.close()

    log.info("Database engine ready (dialect=%s).", settings.dialect)
    return engine


engine = _build_engine()

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    class_=Session,
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a scoped database session.

    The session is always closed, and the transaction is rolled back if the
    request handler raises, so a failed request can never leak a dirty session
    into the next one.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def session_scope() -> Generator[Session, None, None]:
    """Context manager yielding a session for use outside the request cycle (MCP, scripts)."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def database_health() -> Dict[str, str]:
    """Return a shallow health payload describing database connectivity."""
    from sqlalchemy import text

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "ok", "dialect": settings.dialect}
    except Exception as exc:  # pragma: no cover - depends on infrastructure failure
        log.exception("Database health check failed.")
        return {"status": "degraded", "dialect": settings.dialect, "error": type(exc).__name__}

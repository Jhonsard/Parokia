"""Provision a PostgreSQL database from ``backend/schema.sql``.

Usage::

    python backend/scripts/init_db.py                       # uses DATABASE_URL
    DATABASE_URL=postgresql://user:pw@host:5432/parokia_db \\
        python backend/scripts/init_db.py

This script assumes the database and role already exist (create them once via:
``postgres -c "CREATE DATABASE parokia_db;" -c "CREATE USER ..."``). It only
applies the canonical DDL idempotently.
"""

from __future__ import annotations

import logging
import pathlib
import sys

from sqlalchemy import create_engine, text

from parokia.config import settings

log = logging.getLogger("parokia.init_db")


def run() -> None:
    if settings.is_sqlite:
        log.warning(
            "DATABASE_URL is SQLite (%s); use `python -m parokia.seed` for local setup.",
            settings.database_url,
        )
        return

    schema_path = pathlib.Path(__file__).resolve().parents[2] / "schema.sql"
    if not schema_path.is_file():
        raise FileNotFoundError(f"Schema file not found at {schema_path}")

    engine = create_engine(
        settings.database_url,
        isolation_level="AUTOCOMMIT",
        **settings.engine_kwargs(),
    )
    with engine.begin() as connection:
        connection.execute(text(schema_path.read_text(encoding="utf-8")))
    log.info("Applied %d bytes of DDL to %s.", schema_path.stat().st_size, settings.dialect)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        force=True,
    )
    try:
        run()
    except Exception:
        log.exception("Database provisioning failed.")
        sys.exit(1)

"""Shared pytest fixtures for the Parokia backend test-suite.

The suite runs entirely on an in-memory SQLite database so no external
infrastructure is required; the production PostgreSQL path is exercised by the
CI compose stack (see ``backend/scripts/check_schema.py``).
"""

from __future__ import annotations

import contextlib
import importlib
import os
import sys

# Force the in-memory SQLite URL and an insecure-but-valid secret *before* the
# settings singleton is imported.
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("PAROKIA_JWT_SECRET", "test-secret-key-1234567890-abcdef-0123")
os.environ.setdefault("PAROKIA_ENV", "testing")
os.environ.setdefault("PAROKIA_SEED_ON_STARTUP", "1")
os.environ.setdefault("PAROKIA_CORS_CREDENTIALS", "0")

BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

# Drop any previously imported parokia modules so the env vars above take effect.
for mod in list(sys.modules):
    if mod.startswith("parokia") or mod == "server":
        del sys.modules[mod]

import pytest  # noqa: E402
import sqlalchemy as sa  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from parokia.main import app  # noqa: E402
from parokia.models import Base  # noqa: E402


@pytest.fixture(scope="session")
def _engine():
    from parokia.database import engine

    return engine


@pytest.fixture(scope="session", autouse=True)
def _create_schema(_engine):
    """Create every table once for the whole session."""
    Base.metadata.create_all(bind=_engine)
    yield
    Base.metadata.drop_all(bind=_engine)


@pytest.fixture()
def db(_engine):
    """Provide a fresh, auto-rolled-back transaction for each test."""
    from parokia.database import SessionLocal

    connection = _engine.connect()
    transaction = connection.begin()
    session = SessionLocal(bind=connection)
    try:
        yield session
        session.flush()
        transaction.rollback()
    finally:
        session.close()
        connection.close()


@pytest.fixture()
def client(db):
    """A TestClient whose ``get_db`` dependency is wired to the ``db`` fixture."""

    from parokia.database import get_db

    def _override():
        yield db

    app.dependency_overrides[get_db] = _override
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture()
def admin_token(client):
    """A ready-to-use bearer token for the seeded admin account."""
    response = client.post(
        "/api/auth/token",
        data={"username": "admin@parokia.org", "password": "change-me-2026"},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


@pytest.fixture()
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}

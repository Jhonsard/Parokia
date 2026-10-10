"""Parokia backend package.

Layering, from the bottom up:

``config``      environment parsing and validation
``database``    engine, session factory, declarative base
``models``      SQLAlchemy ORM models mirroring ``backend/schema.sql``
``schemas``     Pydantic v2 request/response contracts
``security``    Bcrypt, JWT, RBAC dependencies, throttling
``services``    business rules shared by REST and MCP
``seed``        idempotent baseline data
``errors``      unified JSON error envelope
``routers``     HTTP transport layer
``mcp_server``  FastMCP automation surface
``main``        FastAPI application factory
"""

from __future__ import annotations

from .version import __version__

__all__ = ["__version__"]
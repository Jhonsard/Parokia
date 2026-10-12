"""Parokia — unified entrypoint for the REST API and the FastMCP automation server.

The implementation lives in the :mod:`parokia` package; this module stays the
stable, documented entrypoint referenced by ``docs/AGENTS.md``, the Dockerfile and
the developer workflow.

Usage::

    python server.py                # start the REST API with uvicorn
    PAROKIA_RUN_MCP=1 python server.py   # start the FastMCP server over stdio
    python -m parokia.mcp_server    # same as above, without the env flag

Environment variables (copy ``.env.example`` to ``.env``):

===========================  =========================================================
``DATABASE_URL``             PostgreSQL DSN, or ``sqlite:///./parokia.db`` locally
``PAROKIA_JWT_SECRET``       JWT signing secret (>= 32 chars); mandatory in production
``PAROKIA_ALLOWED_ORIGINS``  Comma-separated CORS origins
``PAROKIA_ACCESS_TOKEN_MINUTES``  Access token lifetime, default 60
``PAROKIA_ENV``              ``development`` | ``production``
``PORT`` / ``HOST``          Bind address for uvicorn, default 0.0.0.0:8000
``PAROKIA_RUN_MCP``          ``1`` to serve MCP instead of HTTP
``PAROKIA_SEED_ON_STARTUP``  ``0`` to skip the idempotent baseline seed
===========================  =========================================================
"""

from __future__ import annotations

import logging
import os

from parokia.config import settings
from parokia.main import app
from parokia.version import __version__

# The FastMCP instance is exposed at module level so the standard inspector entry
# point works: ``mcp dev backend/server.py`` discovers ``mcp``, ``server`` or
# ``app`` in that order and would otherwise fall back to the FastAPI ``app``.
# Importing the module has no side effect: the MCP server only touches the
# database when a resource, tool or prompt is actually invoked.
from parokia.mcp_server import mcp  # noqa: F401  (re-exported for `mcp dev`)

log = logging.getLogger("parokia.server")

__all__ = ["app", "mcp", "__version__"]


def main() -> None:
    """Run either the MCP stdio server or the HTTP API, depending on the environment."""
    logging.basicConfig(
        level=logging.DEBUG if settings.debug else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    if settings.run_mcp:
        from parokia.mcp_server import mcp

        log.info("Starting FastMCP automation server over stdio…")
        mcp.run()
        return

    import uvicorn

    log.info("Starting uvicorn on %s:%s", settings.host, settings.port)
    uvicorn.run(
        "server:app" if __name__ == "__main__" else app,
        host=settings.host,
        port=settings.port,
        reload=settings.debug and os.getenv("PAROKIA_RELOAD") == "1",
        log_level="debug" if settings.debug else "info",
        access_log=False,
    )


if __name__ == "__main__":
    main()
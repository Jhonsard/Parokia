"""Runtime configuration for the Parokia backend.

All environment variables are read once at import time and validated eagerly so
that a misconfigured deployment fails fast instead of surfacing as a 500 later.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Any, Dict, List
from urllib.parse import unquote, urlparse, urlunparse

from sqlalchemy.engine import make_url

# ---------------------------------------------------------------------------
# Environment file loading (zero-dependency, avoids requiring python-dotenv)
# ---------------------------------------------------------------------------

_TRUE_VALUES = {"1", "true", "yes", "on"}
_FALSE_VALUES = {"0", "false", "no", "off"}


def _load_env_file(path: str) -> None:
    """Populate ``os.environ`` from a KEY=VALUE file without overriding real env vars."""
    if not os.path.isfile(path):
        return
    with open(path, "r", encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


_load_env_file(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))
_load_env_file(os.path.join(os.path.dirname(os.path.abspath(os.path.dirname(os.path.abspath(__file__)))), ".env"))


def _env_str(name: str, default: str) -> str:
    value = os.getenv(name)
    return value if value is not None and value != "" else default


def _env_int(name: str, default: int, minimum: int = 1, maximum: int | None = None) -> int:
    raw = _env_str(name, str(default))
    try:
        value = int(raw)
    except ValueError as exc:
        raise RuntimeError(f"Environment variable {name} must be an integer, got {raw!r}") from exc
    if value < minimum or (maximum is not None and value > maximum):
        raise RuntimeError(f"Environment variable {name} must be within [{minimum}, {maximum}], got {value}")
    return value


def _env_bool(name: str, default: bool) -> bool:
    raw = _env_str(name, "1" if default else "0").lower()
    if raw in _TRUE_VALUES:
        return True
    if raw in _FALSE_VALUES:
        return False
    raise RuntimeError(f"Environment variable {name} must be a boolean value, got {raw!r}")


def _env_list(name: str, default: List[str]) -> List[str]:
    raw = os.getenv(name)
    if not raw:
        return list(default)
    return [item.strip() for item in raw.split(",") if item.strip()]


# ---------------------------------------------------------------------------
# DSN normalisation
# ---------------------------------------------------------------------------

_DRIVER_MAP = {
    "postgresql": "postgresql+psycopg",
    "postgres": "postgresql+psycopg",
    "mysql": "mysql+pymysql",
    "mariadb": "mysql+pymysql",
}


def normalize_dsn(dsn: str) -> str:
    """Return a DSN with an explicit SQLAlchemy driver.

    ``postgresql://`` becomes ``postgresql+psycopg://`` so the psycopg 3 driver is
    selected without forcing the caller to spell out the dialect.
    """
    parsed = urlparse(dsn)
    if "+" in parsed.scheme:
        return dsn
    prefix, _, scheme = parsed.scheme.partition("+")
    mapped = _DRIVER_MAP.get(prefix)
    if mapped is None:
        return dsn
    return urlunparse(parsed._replace(scheme=mapped))


def build_engine_kwargs(url: str) -> Dict[str, Any]:
    """Return dialect-specific ``create_engine`` keyword arguments."""
    kwargs: Dict[str, Any] = {"pool_pre_ping": True, "future": True}

    if url.startswith("sqlite"):
        # SQLite is used for zero-infrastructure local development only.
        kwargs["connect_args"] = {"check_same_thread": False}
        return kwargs

    if url.startswith("mysql+"):
        parsed = make_url(url)
        query = dict(parsed.query)
        ssl_value = query.pop("ssl", None)
        if ssl_value is not None:
            decoded = unquote(str(ssl_value)).strip()
            if decoded.startswith("{"):
                ssl_options: Any = json.loads(decoded)
            elif decoded.lower() in _TRUE_VALUES:
                ssl_options = {}
            else:
                ssl_options = {"ca": decoded}
            kwargs["connect_args"] = {"ssl": ssl_options}
        return kwargs

    if url.startswith("postgresql+"):
        kwargs.update({"pool_size": 5, "max_overflow": 10, "pool_recycle": 1800})
    return kwargs


# ---------------------------------------------------------------------------
# Settings object
# ---------------------------------------------------------------------------

_INSECURE_JWT_SECRET = "replace-this-secret-in-production"
_MIN_SECRET_LENGTH = 32


@dataclass(frozen=True)
class Settings:
    """Immutable application settings resolved from the environment."""

    app_name: str
    app_version: str
    environment: str
    debug: bool
    database_url: str
    jwt_secret: str
    jwt_algorithm: str
    access_token_expire_minutes: int
    allowed_origins: List[str] = field(default_factory=list)
    port: int = 8000
    host: str = "0.0.0.0"
    run_mcp: bool = False
    seed_on_startup: bool = True
    bootstrap_admin_email: str = "admin@parokia.org"
    bootstrap_admin_password: str = "change-me-2026"
    cors_allow_credentials: bool = True
    docs_enabled: bool = True

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"production", "prod"}

    @property
    def dialect(self) -> str:
        return self.database_url.split("://", 1)[0]

    def engine_kwargs(self) -> Dict[str, Any]:
        return build_engine_kwargs(self.database_url)


def _validate_secret(settings: Settings) -> None:
    """Refuse to boot with a weak or default JWT secret."""
    if settings.jwt_secret == _INSECURE_JWT_SECRET or len(settings.jwt_secret) < _MIN_SECRET_LENGTH:
        message = (
            "PAROKIA_JWT_SECRET is missing or too weak. "
            f"Set a random value of at least {_MIN_SECRET_LENGTH} characters "
            "(generate one with: openssl rand -hex 32)."
        )
        if settings.is_production or _env_bool("PAROKIA_STRICT_CONFIG", False):
            raise RuntimeError(message)
        # Local development keeps a deterministic fallback but logs loudly.
        import logging

        logging.getLogger("parokia.config").warning(
            "%s Using an insecure development secret; never do this in production.", message
        )


def load_settings() -> Settings:
    """Build the :class:`Settings` singleton from environment variables."""
    environment = _env_str("PAROKIA_ENV", "development")
    debug = _env_bool("PAROKIA_DEBUG", environment.lower() in {"development", "dev", "local"})
    strict = _env_bool("PAROKIA_STRICT_CONFIG", environment.lower() in {"production", "prod"})

    settings = Settings(
        app_name=_env_str("PAROKIA_APP_NAME", "Parokia API"),
        app_version=_env_str("PAROKIA_APP_VERSION", "1.0.0"),
        environment=environment,
        debug=debug,
        database_url=normalize_dsn(_env_str("DATABASE_URL", "sqlite:///./parokia.db")),
        jwt_secret=_env_str("PAROKIA_JWT_SECRET", _INSECURE_JWT_SECRET),
        jwt_algorithm=_env_str("PAROKIA_JWT_ALGORITHM", "HS256"),
        access_token_expire_minutes=_env_int("PAROKIA_ACCESS_TOKEN_MINUTES", 60, minimum=1, maximum=1440),
        allowed_origins=_env_list(
            "PAROKIA_ALLOWED_ORIGINS",
            ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"],
        ),
        port=_env_int("PORT", 8000, minimum=1, maximum=65535),
        host=_env_str("HOST", "0.0.0.0"),
        run_mcp=_env_bool("PAROKIA_RUN_MCP", False),
        seed_on_startup=_env_bool("PAROKIA_SEED_ON_STARTUP", True),
        bootstrap_admin_email=_env_str("PAROKIA_ADMIN_EMAIL", "admin@parokia.org"),
        bootstrap_admin_password=_env_str("PAROKIA_ADMIN_PASSWORD", "change-me-2026"),
        cors_allow_credentials=_env_bool("PAROKIA_CORS_CREDENTIALS", True),
        docs_enabled=_env_bool("PAROKIA_DOCS_ENABLED", environment.lower() not in {"production", "prod"}),
    )

    if strict:
        import logging

        logging.getLogger("parokia.config").info(
            "Strict configuration mode enabled for environment %r.", environment
        )

    _validate_secret(settings)
    return settings


settings = load_settings()

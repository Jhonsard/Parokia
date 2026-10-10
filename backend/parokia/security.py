"""Authentication, password hashing, RBAC dependencies, and throttling.

Technical identifiers stay in English on purpose: this module is shared with the
FastMCP automation server, which addresses tools and resources by English name.
"""

from __future__ import annotations

import logging
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Callable, Deque, Dict, Iterable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import User
from .schemas import Role, UserRecord

log = logging.getLogger("parokia.security")

# passlib's bcrypt backend defaults to 12 rounds, the OWASP-recommended cost.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=True)

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid authentication credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


# ---------------------------------------------------------------------------
# Passwords
# ---------------------------------------------------------------------------


def hash_password(raw_password: str) -> str:
    """Hash a plaintext password with Bcrypt."""
    return pwd_context.hash(raw_password)


def verify_password(raw_password: str, password_hash: str) -> bool:
    """Verify a plaintext password against a Bcrypt hash without leaking exceptions."""
    try:
        return pwd_context.verify(raw_password, password_hash)
    except ValueError:
        log.warning("Password verification failed on a malformed hash.")
        return False


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------


def create_access_token(subject: str, role: Role) -> tuple[str, int]:
    """Issue a signed JWT for ``subject`` and return ``(token, expires_in_seconds)``."""
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": subject,
        "role": role.value,
        "iat": int(now.timestamp()),
        "exp": expires_at,
        "iss": settings.app_name,
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, settings.access_token_expire_minutes * 60


def decode_access_token(token: str) -> Dict[str, object]:
    """Decode and validate a JWT, raising ``JWTError`` on any problem."""
    return jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
        issuer=settings.app_name,
    )


# ---------------------------------------------------------------------------
# Sliding-window throttle (single-process deployments)
# ---------------------------------------------------------------------------


class SlidingWindowThrottle:
    """In-memory fixed-window counter keyed by an arbitrary string.

    Sufficient for a single uvicorn worker. A multi-replica deployment should
    swap this for a Redis-backed limiter; the interface is intentionally the
    same so only the constructor changes.
    """

    def __init__(self, limit: int, window_seconds: int) -> None:
        if limit < 1 or window_seconds < 1:
            raise ValueError("limit and window_seconds must be positive")
        self._limit = limit
        self._window = float(window_seconds)
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def check(self, key: str) -> tuple[bool, int]:
        """Register a hit for ``key`` and return ``(allowed, retry_after_seconds)``."""
        now = time.monotonic()
        with self._lock:
            bucket = self._hits[key]
            while bucket and now - bucket[0] >= self._window:
                bucket.popleft()
            if len(bucket) >= self._limit:
                retry_after = max(1, int(self._window - (now - bucket[0])) + 1)
                return False, retry_after
            bucket.append(now)
            return True, 0

    def reset(self) -> None:
        """Drop every recorded hit. Used by the test-suite."""
        with self._lock:
            self._hits.clear()


login_throttle = SlidingWindowThrottle(limit=8, window_seconds=300)
membership_throttle = SlidingWindowThrottle(limit=5, window_seconds=3600)


def client_key(request: Request) -> str:
    """Best-effort client identity for throttling."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def enforce_throttle(
    request: Request, throttle: SlidingWindowThrottle, message: str = "Too many requests"
) -> None:
    """Raise HTTP 429 when the caller exceeded the throttle budget."""
    allowed, retry_after = throttle.check(client_key(request))
    if not allowed:
        log.warning("Throttled request from %s (%s)", client_key(request), message)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=message,
            headers={"Retry-After": str(retry_after)},
        )


# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------


def to_user_record(user: User) -> UserRecord:
    """Project an ORM user onto the public response schema."""
    return UserRecord(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=Role(user.role),
        choir_id=user.choir_id,
        created_at=user.created_at,
    )


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> UserRecord:
    """Resolve the authenticated user from the bearer token."""
    try:
        payload = decode_access_token(token)
    except JWTError as exc:
        raise CREDENTIALS_ERROR from exc

    subject = payload.get("sub")
    if not isinstance(subject, str) or not subject:
        raise CREDENTIALS_ERROR

    user = db.scalar(select(User).where(User.email == subject))
    if user is None:
        raise CREDENTIALS_ERROR
    return to_user_record(user)


def require_roles(*allowed: Role) -> Callable[..., UserRecord]:
    """Build an RBAC dependency that only lets the listed roles through."""

    permitted: Iterable[Role] = tuple(allowed)

    def _dependency(current: UserRecord = Depends(get_current_user)) -> UserRecord:
        if current.role not in permitted:
            log.warning("Denied %s access to a %s-only resource.", current.role, "/".join(r.value for r in permitted))
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current

    return _dependency


require_admin = require_roles(Role.ADMIN)
require_chapel_or_admin = require_roles(Role.ADMIN, Role.CHOIR_LEADER)


__all__ = [
    "client_key",
    "create_access_token",
    "decode_access_token",
    "enforce_throttle",
    "get_current_user",
    "hash_password",
    "login_throttle",
    "membership_throttle",
    "oauth2_scheme",
    "pwd_context",
    "require_admin",
    "require_chapel_or_admin",
    "require_roles",
    "to_user_record",
    "verify_password",
]

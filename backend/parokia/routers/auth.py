"""Authentication endpoints: token issuance, registration, and profile."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import (
    LoginRequest,
    Role,
    TokenResponse,
    UserCreate,
    UserRecord,
)
from ..security import (
    create_access_token,
    enforce_throttle,
    get_current_user,
    login_throttle,
)
from ..services import ServiceError, authenticate, create_user

log = logging.getLogger("parokia.auth")
router = APIRouter(prefix="/api/auth", tags=["Auth"])

_INVALID_CREDENTIALS = "Incorrect email or password"


def _issue_token(user_email: str, role: Role) -> TokenResponse:
    token, expires_in = create_access_token(user_email, role)
    return TokenResponse(access_token=token, expires_in=expires_in, role=role)


@router.post(
    "/token",
    response_model=TokenResponse,
    summary="Obtain a JWT bearer token (OAuth2 password form)",
)
def login_form(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> TokenResponse:
    """Exchange an email/password pair (OAuth2 form encoding) for a JWT."""
    enforce_throttle(request, login_throttle, "Too many login attempts")
    user = authenticate(db, form_data.username, form_data.password)
    if user is None:
        log.info("Failed login attempt for %s", form_data.username)
        raise ServiceError(_INVALID_CREDENTIALS, status_code=status.HTTP_401_UNAUTHORIZED)
    log.info("Login: %s (%s)", user.email, user.role)
    return _issue_token(user.email, Role(user.role))


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Obtain a JWT bearer token (JSON body)",
)
def login_json(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """JSON alternative to ``/token``, used by the web and mobile clients."""
    enforce_throttle(request, login_throttle, "Too many login attempts")
    user = authenticate(db, payload.email, payload.password)
    if user is None:
        log.info("Failed login attempt for %s", payload.email)
        raise ServiceError(_INVALID_CREDENTIALS, status_code=status.HTTP_401_UNAUTHORIZED)
    return _issue_token(user.email, Role(user.role))


@router.post(
    "/register",
    response_model=UserRecord,
    status_code=status.HTTP_201_CREATED,
    summary="Register a PUBLIC account",
)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> UserRecord:
    """Self-service registration. The role is always PUBLIC regardless of the payload."""
    return create_user(db, payload.full_name, payload.email, payload.password, Role.PUBLIC)


@router.get("/me", response_model=UserRecord, summary="Current user profile")
def me(current: UserRecord = Depends(get_current_user)) -> UserRecord:
    """Return the authenticated user's profile."""
    return current


@router.get("/me/choir", summary="Current user's choir")
def my_choir(
    current: UserRecord = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict[str, object]:
    """Return the choir attached to the authenticated CHOIR_LEADER account."""
    if current.choir_id is None:
        raise ServiceError("No choir is attached to this account", status_code=404)
    from ..services import list_choirs

    records, _ = list_choirs(db)
    for record in records:
        if record.id == current.choir_id:
            return {"choir": record.model_dump(mode="json")}
    raise ServiceError("Choir not found", status_code=404)
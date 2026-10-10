"""Router registry for the Parokia REST API."""

from __future__ import annotations

from fastapi import APIRouter

from . import auth, chapels, choirs, masses, membership, system, theme

api_router = APIRouter()
api_router.include_router(system.router)
api_router.include_router(auth.router)
api_router.include_router(chapels.router)
api_router.include_router(choirs.router)
api_router.include_router(masses.router)
api_router.include_router(membership.router)
api_router.include_router(theme.router)

__all__ = ["api_router"]
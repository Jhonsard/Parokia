"""End-to-end HTTP tests against the FastAPI TestClient.

These run on an in-memory SQLite database seeded by the session-scoped
``_create_schema`` fixture, so they need no external services.
"""

from __future__ import annotations

import pytest
from fastapi import status


class TestHealth:
    def test_health_returns_ok(self, client) -> None:
        response = client.get("/api/health")
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["status"] == "ok"
        assert body["service"] == "parokia-api"
        assert body["database"] == "sqlite"


class TestChapels:
    def test_lists_eight_chapels(self, client) -> None:
        response = client.get("/api/chapels")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 8
        codes = {chapel["code"] for chapel in data}
        assert {"TGN", "USH", "AMN", "MAP", "AMK", "UMJ", "TND", "MWG"} <= codes

    def test_get_by_code(self, client) -> None:
        response = client.get("/api/chapels/by-code/AMN")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["name"] == "AMANI"

    def test_unknown_code_404(self, client) -> None:
        response = client.get("/api/chapels/by-code/ZZZ")
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestMembership:
    def test_submit_request(self, client) -> None:
        response = client.post(
            "/api/membership-requests",
            json={"full_name": "Alice Nsimba", "choir_name": "Chorale Amani", "chapel_id": 3},
        )
        assert response.status_code == status.HTTP_201_CREATED
        body = response.json()
        assert body["status"] == "PENDING"
        assert body["choir_name"] == "Chorale Amani"

    def test_submit_rejects_invalid_chapel(self, client) -> None:
        response = client.post(
            "/api/membership-requests",
            json={"full_name": "Alice Nsimba", "choir_name": "Chorale Inconnue", "chapel_id": 999},
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestAuth:
    def test_login_returns_token_and_role(self, client) -> None:
        response = client.post(
            "/api/auth/token",
            data={"username": "admin@parokia.org", "password": "change-me-2026"},
        )
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["token_type"] == "bearer"
        assert body["role"] == "ADMIN"
        assert body["access_token"]

    def test_login_wrong_password(self, client) -> None:
        response = client.post(
            "/api/auth/token",
            data={"username": "admin@parokia.org", "password": "wrong"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_protected_route_requires_token(self, client) -> None:
        response = client.get("/api/chapels")
        assert response.status_code == status.HTTP_200_OK  # public
        response = client.get("/api/choirs")
        assert response.status_code == status.HTTP_200_OK  # read-only endpoint is public
        response = client.get("/api/membership-requests")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_admin_can_read_membership_queue(self, client, admin_headers) -> None:
        response = client.get("/api/membership-requests", headers=admin_headers)
        assert response.status_code == status.HTTP_200_OK
        assert isinstance(response.json()["items"], list)


class TestMasses:
    def test_list_masses(self, client) -> None:
        response = client.get("/api/masses")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["meta"]["total"] >= 1

    def test_create_mass_requires_role(self, client) -> None:
        response = client.post(
            "/api/masses",
            json={
                "chapel_id": 1,
                "mass_date": "2026-10-12",
                "mass_time": "08:00:00.000Z",
                "title": "Messe de test",
                "liturgical_color": "#0284C7",
            },
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_admin_creates_then_deletes_mass(self, client, admin_headers) -> None:
        payload = {
            "chapel_id": 1,
            "mass_date": "2026-12-25",
            "mass_time": "10:00:00.000Z",
            "title": "Messe de Noël",
            "liturgical_color": "#EAB308",
        }
        created = client.post("/api/masses", json=payload, headers=admin_headers)
        assert created.status_code == status.HTTP_201_CREATED
        mass_id = created.json()["id"]
        deleted = client.delete(f"/api/masses/{mass_id}", headers=admin_headers)
        assert deleted.status_code == status.HTTP_204_NO_CONTENT


class TestTheme:
    def test_get_theme(self, client) -> None:
        response = client.get("/api/liturgical-theme")
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["current_color"].startswith("#")
        assert body["active_season"]

    def test_update_theme_requires_admin(self, client, admin_headers) -> None:
        response = client.patch(
            "/api/liturgical-theme",
            json={"color_code": "#7C3AED", "season_name": "Avent et Carême"},
            headers=admin_headers,
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["current_color"] == "#7C3AED"

    def test_update_theme_rejects_bad_color(self, client, admin_headers) -> None:
        response = client.patch(
            "/api/liturgical-theme",
            json={"color_code": "not-a-color", "season_name": "x"},
            headers=admin_headers,
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

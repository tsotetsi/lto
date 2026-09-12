"""Tests for auth router endpoints."""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi import status

from auth.models import User


class TestRegister:
    """POST /api/auth/register"""

    def test_register_success(self, client, mock_db, override_get_db):
        """A valid registration creates a user and returns a token."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None  # no existing user
        mock_db.execute.return_value = mock_result

        user_id = uuid4()
        mock_user = MagicMock(spec=User)
        mock_user.id = user_id
        mock_user.email = "new@example.com"
        mock_user.display_name = "New User"
        mock_user.is_admin = False
        mock_user.created_at = "2026-01-01T00:00:00"

        mock_db.refresh = AsyncMock(side_effect=lambda obj: (
            setattr(obj, "id", user_id),
            setattr(obj, "created_at", datetime.utcnow()),
            setattr(obj, "is_admin", False),
            setattr(obj, "is_active", True),
        )[-1])

        response = client.post(
            "/api/auth/register",
            json={
                "email": "new@example.com",
                "password": "securepassword123",
                "display_name": "New User",
            },
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "new@example.com"
        assert data["user"]["display_name"] == "New User"

    def test_register_duplicate_email(self, client, mock_db, override_get_db):
        """Registering with an existing email returns 409."""
        mock_result = MagicMock()
        existing_user = MagicMock(spec=User)
        existing_user.email = "existing@example.com"
        mock_result.scalar_one_or_none.return_value = existing_user
        mock_db.execute.return_value = mock_result

        response = client.post(
            "/api/auth/register",
            json={
                "email": "existing@example.com",
                "password": "securepassword123",
            },
        )

        assert response.status_code == status.HTTP_409_CONFLICT
        assert "already registered" in response.json()["detail"].lower()

    def test_register_short_password(self, client, mock_db, override_get_db):
        """Password shorter than 8 chars returns 422."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        response = client.post(
            "/api/auth/register",
            json={
                "email": "test@example.com",
                "password": "short",
            },
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert "8 characters" in response.json()["detail"]

    def test_register_invalid_email(self, client, mock_db, override_get_db):
        """Invalid email format returns 422."""
        response = client.post(
            "/api/auth/register",
            json={
                "email": "not-an-email",
                "password": "securepassword123",
            },
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestLogin:
    """POST /api/auth/login"""

    def test_login_success(self, client, mock_db, override_get_db):
        """Valid credentials return a token."""
        user_id = uuid4()
        mock_user = MagicMock(spec=User)
        mock_user.id = user_id
        mock_user.email = "user@example.com"
        mock_user.display_name = "Test User"
        mock_user.is_active = True
        mock_user.is_admin = False
        mock_user.created_at = "2026-01-01T00:00:00"
        mock_user.hashed_password = "$2b$12$"  # fake bcrypt hash

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result

        # Mock password verification to return True
        with patch("auth.router.verify_password", return_value=True):
            response = client.post(
                "/api/auth/login",
                json={
                    "email": "user@example.com",
                    "password": "correctpassword",
                },
            )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "user@example.com"

    def test_login_wrong_password(self, client, mock_db, override_get_db):
        """Wrong password returns 401."""
        mock_user = MagicMock(spec=User)
        mock_user.id = uuid4()
        mock_user.email = "user@example.com"
        mock_user.is_active = True
        mock_user.hashed_password = "$2b$12$"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result

        with patch("auth.router.verify_password", return_value=False):
            response = client.post(
                "/api/auth/login",
                json={
                    "email": "user@example.com",
                    "password": "wrongpassword",
                },
            )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "invalid" in response.json()["detail"].lower()

    def test_login_nonexistent_user(self, client, mock_db, override_get_db):
        """Non-existent email returns 401."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        response = client.post(
            "/api/auth/login",
            json={
                "email": "ghost@example.com",
                "password": "anypassword",
            },
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_inactive_user(self, client, mock_db, override_get_db):
        """Inactive user returns 403."""
        mock_user = MagicMock(spec=User)
        mock_user.id = uuid4()
        mock_user.is_active = False
        mock_user.hashed_password = "$2b$12$"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result

        with patch("auth.router.verify_password", return_value=True):
            response = client.post(
                "/api/auth/login",
                json={
                    "email": "inactive@example.com",
                    "password": "anypassword",
                },
            )

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "inactive" in response.json()["detail"].lower()


class TestMe:
    """GET /api/auth/me"""

    def test_me_authenticated(self, client, mock_db, override_get_db, override_get_current_user, test_token):
        """Authenticated user can access /me."""
        user_id = uuid4()
        mock_user = MagicMock(spec=User)
        mock_user.id = user_id
        mock_user.email = "me@example.com"
        mock_user.display_name = "Me"
        mock_user.is_active = True
        mock_user.is_admin = False
        mock_user.created_at = "2026-01-01T00:00:00"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_user
        mock_db.execute.return_value = mock_result

        # Set the current user in the override
        override_get_current_user(mock_user)

        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {test_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["email"] == "me@example.com"

    def test_me_unauthenticated(self, client):
        """Request without token returns 401."""
        response = client.get("/api/auth/me")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_me_invalid_token(self, client):
        """Request with garbage token returns 401."""
        response = client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer this-is-not-a-valid-jwt"},
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

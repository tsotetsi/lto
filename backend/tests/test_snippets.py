"""Tests for resume/snippet router endpoints."""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi import status

from auth.models import User
from resumes.models import Snippet


def _make_mock_user(user_id=None, is_admin=False) -> MagicMock:
    uid = user_id or uuid4()
    user = MagicMock(spec=User)
    user.id = uid
    user.email = "user@example.com"
    user.display_name = "Test User"
    user.is_active = True
    user.is_admin = is_admin
    return user


def _make_mock_snippet(snippet_id=None, user_id=None) -> MagicMock:
    sid = snippet_id or uuid4()
    snip = MagicMock(spec=Snippet)
    snip.id = sid
    snip.user_id = user_id
    snip.internal_name = "test_snippet"
    snip.default_display_name = "Test Snippet"
    snip.description = "A test snippet"
    snip.latex_content = "\\item Test content"
    snip.category = "personal"
    snip.is_user_defined = bool(user_id)
    snip.created_at = "2026-01-01T00:00:00"
    snip.updated_at = "2026-01-01T00:00:00"
    snip.preferences = []
    snip.owner = None
    return snip


class TestGetAllSnippets:
    """GET /api/snippets"""

    def test_list_snippets_unauthenticated(self, client, mock_db, override_get_db):
        """Unauthenticated users see only system snippets."""
        system_snippet = _make_mock_snippet(user_id=None)

        mock_result = MagicMock()
        mock_result.unique.return_value.scalars.return_value.all.return_value = [system_snippet]
        mock_db.execute.return_value = mock_result

        response = client.get("/api/snippets")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["snippets"]) == 1

    def test_list_snippets_authenticated(self, client, mock_db, override_get_db, override_get_optional_user, test_token):
        """Authenticated users see system + their own snippets."""
        uid = uuid4()
        user = _make_mock_user(user_id=uid)
        system_snippet = _make_mock_snippet(user_id=None)
        user_snippet = _make_mock_snippet(user_id=uid)

        mock_result = MagicMock()
        mock_result.unique.return_value.scalars.return_value.all.return_value = [
            system_snippet, user_snippet,
        ]
        mock_db.execute.return_value = mock_result

        override_get_optional_user(user)

        response = client.get(
            "/api/snippets",
            headers={"Authorization": f"Bearer {test_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()["snippets"]) == 2


class TestGetSnippet:
    """GET /api/snippets/{id}"""

    def test_get_existing(self, client, mock_db, override_get_db, test_token):
        """Returns a single snippet by ID."""
        sid = uuid4()
        snippet = _make_mock_snippet(snippet_id=sid)

        mock_result = MagicMock()
        mock_result.unique.return_value.scalar_one_or_none.return_value = snippet
        mock_db.execute.return_value = mock_result

        response = client.get(
            f"/api/snippets/{sid}",
            headers={"Authorization": f"Bearer {test_token}"},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["id"] == str(sid)

    def test_get_non_existent(self, client, mock_db, override_get_db, test_token):
        """Non-existent snippet returns 404."""
        mock_result = MagicMock()
        mock_result.unique.return_value.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        response = client.get(
            f"/api/snippets/{uuid4()}",
            headers={"Authorization": f"Bearer {test_token}"},
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestCreateSnippet:
    """POST /api/snippets"""

    def test_create_snippet(self, client, mock_db, override_get_db, override_get_current_user, test_token):
        """Authenticated user can create a snippet."""
        uid = uuid4()
        user = _make_mock_user(user_id=uid)
        sid = uuid4()

        mock_db.refresh = AsyncMock(side_effect=lambda obj: (
            setattr(obj, "id", sid),
            setattr(obj, "created_at", datetime.utcnow()),
            setattr(obj, "updated_at", datetime.utcnow()),
        )[-1])
        override_get_current_user(user)

        response = client.post(
            "/api/snippets",
            json={
                "internal_name": "my_snippet",
                "default_display_name": "My Snippet",
                "description": "A personal snippet",
                "latex_content": "\\item Personal achievement",
                "category": "personal",
            },
            headers={"Authorization": f"Bearer {test_token}"},
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["display_name"] == "My Snippet"

    def test_create_snippet_unauthenticated(self, client):
        """Unauthenticated request returns 401."""
        response = client.post(
            "/api/snippets",
            json={
                "internal_name": "test",
                "default_display_name": "Test",
                "latex_content": "content",
            },
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestUpdateSnippet:
    """PUT /api/snippets/{id}"""

    def test_update_own_snippet(self, client, mock_db, override_get_db, override_get_current_user, test_token):
        """User can update their own snippet."""
        uid = uuid4()
        user = _make_mock_user(user_id=uid)
        sid = uuid4()
        snippet = _make_mock_snippet(snippet_id=sid, user_id=uid)

        mock_result = MagicMock()
        mock_result.unique.return_value.scalar_one_or_none.return_value = snippet
        mock_db.execute.return_value = mock_result

        override_get_current_user(user)

        response = client.put(
            f"/api/snippets/{sid}",
            json={
                "internal_name": "my_snippet",
                "default_display_name": "Updated Name",
                "latex_content": "\\item Updated content",
            },
            headers={"Authorization": f"Bearer {test_token}"},
        )

        assert response.status_code == status.HTTP_200_OK

    def test_update_system_snippet_as_user(self, client, mock_db, override_get_db, override_get_current_user, test_token):
        """Regular user cannot update system snippets."""
        uid = uuid4()
        user = _make_mock_user(user_id=uid, is_admin=False)
        sid = uuid4()
        snippet = _make_mock_snippet(snippet_id=sid, user_id=None)  # system snippet

        mock_result = MagicMock()
        mock_result.unique.return_value.scalar_one_or_none.return_value = snippet
        mock_db.execute.return_value = mock_result

        override_get_current_user(user)

        response = client.put(
            f"/api/snippets/{sid}",
            json={
                "internal_name": "system",
                "default_display_name": "Hacked",
                "latex_content": "hacked",
            },
            headers={"Authorization": f"Bearer {test_token}"},
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestDeleteSnippet:
    """DELETE /api/snippets/{id}"""

    def test_delete_own_snippet(self, client, mock_db, override_get_db, override_get_current_user, test_token):
        """User can delete their own snippet."""
        uid = uuid4()
        user = _make_mock_user(user_id=uid)
        sid = uuid4()
        snippet = _make_mock_snippet(snippet_id=sid, user_id=uid)

        mock_result = MagicMock()
        mock_result.unique.return_value.scalar_one_or_none.return_value = snippet
        mock_db.execute.return_value = mock_result

        override_get_current_user(user)

        response = client.delete(
            f"/api/snippets/{sid}",
            headers={"Authorization": f"Bearer {test_token}"},
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_delete_system_snippet_as_user(self, client, mock_db, override_get_db, override_get_current_user, test_token):
        """Regular user cannot delete system snippets."""
        uid = uuid4()
        user = _make_mock_user(user_id=uid, is_admin=False)
        sid = uuid4()
        snippet = _make_mock_snippet(snippet_id=sid, user_id=None)

        mock_result = MagicMock()
        mock_result.unique.return_value.scalar_one_or_none.return_value = snippet
        mock_db.execute.return_value = mock_result

        override_get_current_user(user)

        response = client.delete(
            f"/api/snippets/{sid}",
            headers={"Authorization": f"Bearer {test_token}"},
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

"""Shared fixtures and helpers for backend tests."""

import json
import os
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

# Set required env vars BEFORE any module that loads Settings is imported.
# database.py calls get_settings() at module level, so these must be set early.
# Use the _FILE suffixed names (matching validation_alias in config.py) but with
# plain string values — resolve_secret() will return them as-is since they don't
# start with /run/secrets/ or .secrets/.
os.environ.setdefault("SECRET_KEY_FILE", "test-secret-key-not-for-production")
os.environ.setdefault("POSTGRES_USER_FILE", "test_user")
os.environ.setdefault("POSTGRES_PASSWORD_FILE", "test_pass")
os.environ.setdefault("POSTGRES_DB", "test_db")
os.environ.setdefault("POSTGRES_HOST", "localhost")
os.environ.setdefault("POSTGRES_PORT", "5432")
os.environ.setdefault("JWT_SECRET_KEY_FILE", "test-jwt-secret")

# Prevent Loki logging from crashing during teardown — no Loki server in test env.
os.environ["GRAFANA_LOKI_URL"] = ""

from managers import TemplateManager  # noqa: E402
from templates.models import Template, TemplateVariable  # noqa: E402
from main import app  # noqa: E402
from database import get_db  # noqa: E402
from auth.dependencies import get_current_user, get_optional_user  # noqa: E402


# ── Client fixture (shared across all test modules) ──────────────────────────

@pytest.fixture
def client():
    """FastAPI TestClient bound to the main app."""
    with TestClient(app) as c:
        yield c


# ── Shared mock fixtures ─────────────────────────────────────────────────────

@pytest.fixture
def mock_db() -> MagicMock:
    """A mock AsyncSession.

    Returns a plain MagicMock with async methods manually configured as
    AsyncMock.  Tests override mock_db.execute.return_value to set up
    query results.
    """
    db = MagicMock()
    # AsyncMock so that await db.execute(...) returns a coroutine that
    # in turn returns mock_db.execute.return_value.
    db.execute = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.delete = AsyncMock()
    return db


@pytest.fixture
def test_token() -> str:
    """A valid JWT for the test user."""
    from auth.utils import create_access_token  # noqa: E402
    return create_access_token(uuid4())


# ── FastAPI dependency overrides ─────────────────────────────────────────────
# These use app.dependency_overrides which is the correct way to mock FastAPI
# dependencies.  Using patch() on the router module doesn't work because
# Depends() captures the function object at import time.

@pytest.fixture
def override_get_db(mock_db: AsyncMock):
    """Override the get_db dependency with a mock session."""
    app.dependency_overrides[get_db] = lambda: mock_db
    yield
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def override_get_current_user():
    """Override get_current_user.  Yields a setter function."""
    container: dict = {"user": None}

    def set_user(user):
        container["user"] = user

    app.dependency_overrides[get_current_user] = lambda: container["user"]
    yield set_user
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def override_get_optional_user():
    """Override get_optional_user.  Yields a setter function."""
    container: dict = {"user": None}

    def set_user(user):
        container["user"] = user

    app.dependency_overrides[get_optional_user] = lambda: container["user"]
    yield set_user
    app.dependency_overrides.pop(get_optional_user, None)


# ── Template fixtures ────────────────────────────────────────────────────────

@pytest.fixture
def sample_template() -> Template:
    """A minimal template for testing."""
    return Template(
        id="test_template",
        name="Test Template",
        description="A template for testing",
        category="professional",
        tex_content=(
            r"\documentclass[a4paper]{article}" "\n"
            r"\begin{document}" "\n"
            r"Name: {{name}}" "\n"
            r"Role: {{role}}" "\n"
            r"\end{document}" "\n"
        ),
        variables={
            "name": TemplateVariable(
                name="name",
                label="Full Name",
                default="John Doe",
                type="text",
            ),
            "role": TemplateVariable(
                name="role",
                label="Job Title",
                default="Engineer",
                type="text",
            ),
        },
        font="Liberation Sans",
        created_at="2025-01-01",
        updated_at="2025-01-01",
        is_free=True,
    )


@pytest.fixture
def template_with_multiline() -> Template:
    """Template with a multiline variable."""
    return Template(
        id="multiline_test",
        name="Multiline Template",
        description="Template with multiline fields",
        category="professional",
        tex_content=(
            r"\documentclass[a4paper]{article}" "\n"
            r"\begin{document}" "\n"
            r"{{summary}}" "\n"
            r"\end{document}" "\n"
        ),
        variables={
            "summary": TemplateVariable(
                name="summary",
                label="Summary",
                default="Default summary.",
                type="multiline",
            ),
        },
        font="Times New Roman",
        created_at="2025-01-01",
        updated_at="2025-01-01",
        is_free=True,
    )


@pytest.fixture
def template_manager(tmp_path: Path) -> TemplateManager:
    """A TemplateManager backed by a temporary directory."""
    mgr = TemplateManager(template_dir=str(tmp_path / "templates"))
    for cat in mgr.categories:
        (mgr.template_dir / cat).mkdir(parents=True, exist_ok=True)
    return mgr


@pytest.fixture
def populated_template_manager(tmp_path: Path, sample_template: Template) -> TemplateManager:
    """A template manager with one template already saved to disk."""
    mgr = TemplateManager(template_dir=str(tmp_path / "templates"))
    for cat in mgr.categories:
        (mgr.template_dir / cat).mkdir(parents=True, exist_ok=True)
    dest = mgr.template_dir / "professional" / f"{sample_template.id}.json"
    with open(dest, "w") as f:
        json.dump(sample_template.model_dump(), f, indent=2)
    return mgr


@pytest.fixture
def sample_tex_content() -> str:
    """Valid minimal LaTeX document."""
    return (
        r"\documentclass[a4paper]{article}" "\n"
        r"\usepackage{fontspec}" "\n"
        r"\begin{document}" "\n"
        r"Hello, world!" "\n"
        r"\end{document}" "\n"
    )

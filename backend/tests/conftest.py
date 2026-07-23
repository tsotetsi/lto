"""Shared fixtures and helpers for backend tests."""

import json
import shutil
import tempfile
from pathlib import Path

import pytest

from managers import TemplateManager
from templates.models import Template, TemplateVariable


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
    # Create category subdirectories as the manager does on init
    for cat in mgr.categories:
        (mgr.template_dir / cat).mkdir(parents=True, exist_ok=True)
    return mgr


@pytest.fixture
def populated_template_manager(tmp_path: Path, sample_template: Template) -> TemplateManager:
    """A template manager with one template already saved to disk."""
    mgr = TemplateManager(template_dir=str(tmp_path / "templates"))
    for cat in mgr.categories:
        (mgr.template_dir / cat).mkdir(parents=True, exist_ok=True)

    # Write the sample template to the professional category
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

"""Tests for FastAPI router endpoints using TestClient."""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from main import app


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def client():
    """FastAPI TestClient bound to the main app."""
    with TestClient(app) as c:
        yield c


# ── Health ────────────────────────────────────────────────────────────────────

class TestHealthEndpoint:
    def test_health_returns_ok(self, client):
        """GET /health returns {'status': 'healthy'}."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}

    def test_health_has_cors_headers(self, client):
        """Health endpoint includes CORS headers when Origin is sent."""
        response = client.get("/health", headers={"Origin": "http://example.com"})
        assert response.status_code == 200
        assert "access-control-allow-origin" in response.headers


# ── Templates List ────────────────────────────────────────────────────────────

class TestGetAllTemplates:
    def test_list_all_templates(self, client):
        """GET /templates returns a list of templates."""
        response = client.get("/templates")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # We expect at least the default templates
        assert len(data) > 0

    def test_template_fields_present(self, client):
        """Each template in the list has the expected fields."""
        response = client.get("/templates")
        data = response.json()
        for tmpl in data:
            assert "id" in tmpl
            assert "name" in tmpl
            assert "description" in tmpl
            assert "category" in tmpl
            assert "tex_content" in tmpl
            assert "variables" in tmpl
            assert isinstance(tmpl["variables"], dict)

    def test_has_modern_professional(self, client):
        """The default 'modern_professional' template is present."""
        response = client.get("/templates")
        ids = [t["id"] for t in response.json()]
        assert "modern_professional" in ids

    def test_has_cover_letter(self, client):
        """The default cover letter template is present."""
        response = client.get("/templates")
        ids = [t["id"] for t in response.json()]
        assert "cover_letter_standard" in ids

    def test_filter_by_category_professional(self, client):
        """Filtering by 'professional' returns only professional templates."""
        response = client.get("/templates?category=professional")
        data = response.json()
        assert all(t["category"] == "professional" for t in data)
        assert len(data) >= 2  # modern_professional + classic_elegant

    def test_filter_by_category_cover_letter(self, client):
        """Filtering by 'cover-letter' returns only that category."""
        response = client.get("/templates?category=cover-letter")
        data = response.json()
        assert all(t["category"] == "cover-letter" for t in data)

    def test_filter_by_non_existent_category(self, client):
        """Filtering by a non-existent category returns an empty list."""
        response = client.get("/templates?category=nonexistent")
        assert response.status_code == 200
        assert response.json() == []


# ── Single Template ──────────────────────────────────────────────────────────

class TestGetTemplate:
    def test_get_existing_template(self, client):
        """GET /templates/{id} returns the template."""
        response = client.get("/templates/modern_professional")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "modern_professional"
        assert data["name"] == "Modern Professional"

    def test_get_non_existent_template_returns_404(self, client):
        """GET /templates/{id} with unknown id returns 404."""
        response = client.get("/templates/does_not_exist_xyz")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_template_has_variables(self, client):
        """A template's variables field contains the expected keys."""
        response = client.get("/templates/modern_professional")
        data = response.json()
        variables = data["variables"]
        assert "name" in variables
        assert "email" in variables
        assert "summary" in variables


# ── Fill Template ────────────────────────────────────────────────────────────

class TestFillTemplate:
    def test_fill_all_variables(self, client):
        """POST /templates/{id}/fill replaces variables with values."""
        response = client.post(
            "/templates/modern_professional/fill",
            json={
                "template_id": "modern_professional",
                "variables": {
                    "name": "Jane Smith",
                    "email": "jane@example.com",
                    "phone": "+1 555-0001",
                    "linkedin": "linkedin.com/in/janesmith",
                    "github": "github.com/janesmith",
                    "summary": "A brief summary.",
                    "experience": "\\item Worked at Corp.",
                    "education": "\\item MSc CS.",
                    "skills": "\\item Python",
                    "projects": "\\item Project X",
                },
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "tex_content" in data
        tex = data["tex_content"]
        # Variables should be replaced
        assert "Jane Smith" in tex
        assert "jane@example.com" in tex
        # Placeholder syntax should be gone for filled variables
        assert "{{name}}" not in tex
        assert "{{email}}" not in tex

    def test_fill_partial_variables(self, client):
        """Unfilled variables keep their {{placeholders}}."""
        response = client.post(
            "/templates/modern_professional/fill",
            json={
                "template_id": "modern_professional",
                "variables": {"name": "Alice"},
            },
        )
        assert response.status_code == 200
        tex = response.json()["tex_content"]
        assert "Alice" in tex
        # Other variables were not provided — placeholders remain
        assert "{{email}}" in tex
        assert "{{phone}}" in tex

    def test_fill_nonexistent_template_returns_400(self, client):
        """POST /templates/{id}/fill with bad id returns 400."""
        response = client.post(
            "/templates/ghost/fill",
            json={
                "template_id": "ghost",
                "variables": {"name": "X"},
            },
        )
        assert response.status_code == 400
        assert "not found" in response.json()["detail"].lower()

    def test_fill_with_empty_variables(self, client):
        """Empty variables dict is accepted."""
        response = client.post(
            "/templates/modern_professional/fill",
            json={
                "template_id": "modern_professional",
                "variables": {},
            },
        )
        assert response.status_code == 200
        tex = response.json()["tex_content"]
        # All placeholders should remain
        assert "{{name}}" in tex
        assert "{{email}}" in tex


# ── Compile Raw ───────────────────────────────────────────────────────────────

class TestCompileRaw:
    def test_compile_invalid_latex_returns_400(self, client):
        """POST /compile/raw with invalid LaTeX returns 400."""
        response = client.post(
            "/compile/raw",
            json={
                "tex_content": "Not a real LaTeX doc",
                "file_name": "test",
                "font": "Liberation Sans",
            },
        )
        assert response.status_code == 400
        assert "Invalid LaTeX document" in response.json()["detail"]

    def test_compile_routes_to_service(self, client):
        """POST /compile/raw calls compile_latex with the right args."""
        tex = (
            "\\documentclass[a4paper]{article}\n"
            "\\begin{document}\n"
            "Hello\n"
            "\\end{document}\n"
        )

        with patch("main.compile_latex") as mock_compile:
            mock_compile.return_value = {"message": "Mocked"}

            response = client.post(
                "/compile/raw",
                json={
                    "tex_content": tex,
                    "file_name": "resume",
                    "font": "Times New Roman",
                },
            )

        assert response.status_code == 200
        # Verify compile_latex was called with correct args
        mock_compile.assert_called_once()
        call_args = mock_compile.call_args[0][0]  # First positional arg
        assert call_args.tex_content == tex
        assert call_args.file_name == "resume"
        assert call_args.font == "Times New Roman"


class TestCompileDocx:
    def test_docx_invalid_latex_returns_400(self, client):
        """POST /compile/docx with invalid LaTeX returns 400."""
        response = client.post(
            "/compile/docx",
            json={
                "tex_content": "Not a real LaTeX doc",
                "file_name": "test",
                "font": "Liberation Sans",
            },
        )
        assert response.status_code == 400
        assert "Invalid LaTeX document" in response.json()["detail"]

    def test_docx_routes_to_service(self, client):
        """POST /compile/docx calls compile_docx with the right args."""
        tex = (
            "\\documentclass[a4paper]{article}\n"
            "\\begin{document}\n"
            "Hello\n"
            "\\end{document}\n"
        )

        with patch("main.compile_docx") as mock_compile:
            mock_compile.return_value = {"message": "Mocked"}

            response = client.post(
                "/compile/docx",
                json={
                    "tex_content": tex,
                    "file_name": "my_doc",
                    "font": "Liberation Serif",
                },
            )

        assert response.status_code == 200
        mock_compile.assert_called_once()
        call_args = mock_compile.call_args[0][0]
        assert call_args.tex_content == tex
        assert call_args.file_name == "my_doc"
        assert call_args.font == "Liberation Serif"


# ── Compile from Template ─────────────────────────────────────────────────────

class TestCompileFromTemplate:
    def test_compile_invalid_template_returns_404(self, client):
        """POST /templates/compile with bad template_id returns 404."""
        response = client.post(
            "/templates/compile",
            json={
                "template_id": "non_existent",
                "variables": {"name": "Test"},
                "file_name": "test",
            },
        )
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_compile_template_calls_service(self, client):
        """POST /templates/compile fills template then calls compile_latex."""
        with patch("templates.router.compile_latex") as mock_compile:
            mock_compile.return_value = {"message": "Mocked"}

            response = client.post(
                "/templates/compile",
                json={
                    "template_id": "modern_professional",
                    "variables": {"name": "Alice"},
                    "file_name": "my_doc",
                },
            )

        assert response.status_code == 200
        # Verify compile_latex was called with a ResumeRequest containing filled content
        mock_compile.assert_called_once()
        call_req = mock_compile.call_args[0][0]
        assert "Alice" in call_req.tex_content
        assert call_req.file_name == "my_doc"


# ── OpenAPI docs ──────────────────────────────────────────────────────────────

class TestDocs:
    def test_swagger_ui_accessible(self, client):
        """GET /docs returns the Swagger UI page."""
        response = client.get("/docs")
        assert response.status_code == 200
        assert "swagger" in response.text.lower()

    def test_openapi_json(self, client):
        """GET /openapi.json returns the API schema."""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        schema = response.json()
        assert "openapi" in schema
        assert "/health" in schema["paths"]
        assert "/templates" in schema["paths"]

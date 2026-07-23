"""Tests for Pydantic models in templates/models.py."""

import pytest
from pydantic import ValidationError

from templates.models import Template, TemplateVariable


class TestTemplateVariable:
    def test_minimal(self):
        """Can create a TemplateVariable with just name and label."""
        v = TemplateVariable(name="foo", label="Foo Label")
        assert v.name == "foo"
        assert v.label == "Foo Label"
        assert v.default == ""  # default empty string
        assert v.required is True  # required by default
        assert v.type == "text"  # default type

    def test_with_all_fields(self):
        """Can create a TemplateVariable with all fields specified."""
        v = TemplateVariable(
            name="email",
            label="Email Address",
            default="user@example.com",
            required=False,
            type="email",
        )
        assert v.name == "email"
        assert v.label == "Email Address"
        assert v.default == "user@example.com"
        assert v.required is False
        assert v.type == "email"

    def test_multiline_type(self):
        """The 'multiline' type is accepted."""
        v = TemplateVariable(name="bio", label="Biography", type="multiline")
        assert v.type == "multiline"

    def test_name_missing_raises(self):
        """Name is required."""
        with pytest.raises(ValidationError):
            TemplateVariable(label="No Name")  # type: ignore[call-arg]

    def test_label_missing_raises(self):
        """Label is required."""
        with pytest.raises(ValidationError):
            TemplateVariable(name="noname")  # type: ignore[call-arg]


class TestTemplate:
    def test_minimal(self, sample_template):
        """A fully populated template loads and fields match."""
        t = sample_template
        assert t.id == "test_template"
        assert t.name == "Test Template"
        assert t.description == "A template for testing"
        assert t.category == "professional"
        assert "{{name}}" in t.tex_content
        assert "{{role}}" in t.tex_content
        assert len(t.variables) == 2
        assert t.font == "Liberation Sans"
        assert t.is_free is True

    def test_variable_values(self, sample_template):
        """Template variables are accessible by key."""
        name_var = sample_template.variables["name"]
        assert name_var.label == "Full Name"
        assert name_var.default == "John Doe"

        role_var = sample_template.variables["role"]
        assert role_var.label == "Job Title"
        assert role_var.default == "Engineer"

    def test_optional_thumbnail_defaults_none(self, sample_template):
        """thumbnail defaults to None."""
        assert sample_template.thumbnail is None

    def test_optional_font_default(self):
        """font defaults to Liberation Sans."""
        t = Template(
            id="no_font",
            name="No Font",
            description="No font specified",
            category="blank",
            tex_content="",
            variables={},
            created_at="2025-01-01",
            updated_at="2025-01-01",
        )
        assert t.font == "Liberation Sans"

    def test_is_free_default_true(self):
        """is_free defaults to True."""
        t = Template(
            id="freebie",
            name="Free",
            description="Free template",
            category="blank",
            tex_content="",
            variables={},
            created_at="2025-01-01",
            updated_at="2025-01-01",
        )
        assert t.is_free is True

    def test_multiline_variable(self, template_with_multiline):
        """A multiline variable is stored and retrieved correctly."""
        var = template_with_multiline.variables["summary"]
        assert var.type == "multiline"
        assert var.default == "Default summary."

    def test_model_dump_roundtrip(self, sample_template):
        """Serialising to dict and back preserves the data."""
        data = sample_template.model_dump()
        restored = Template(**data)
        assert restored.id == sample_template.id
        assert restored.name == sample_template.name
        assert restored.tex_content == sample_template.tex_content
        assert list(restored.variables.keys()) == list(sample_template.variables.keys())

    def test_id_missing_raises(self):
        """id is required."""
        with pytest.raises(ValidationError):
            Template(
                name="Missing ID",
                description="No id field",
                category="blank",
                tex_content="",
                variables={},
                created_at="2025-01-01",
                updated_at="2025-01-01",
            )

"""Tests for TemplateManager in managers.py."""

import json

import pytest

from managers import TemplateManager
from templates.models import Template


class TestTemplateManagerInit:
    def test_creates_directories(self, tmp_path):
        """TemplateManager creates the template directory and category subdirs."""
        base = tmp_path / "custom_templates"
        mgr = TemplateManager(template_dir=str(base))
        assert base.exists()
        for cat in mgr.categories:
            assert (base / cat).exists()

    def test_categories_list(self, template_manager):
        """Default categories are present."""
        expected = {"professional", "creative", "academic", "cover-letter", "blank"}
        assert set(template_manager.categories) == expected


class TestTemplateManagerLoadTemplate:
    def test_load_existing(self, populated_template_manager):
        """Loading an existing template returns it."""
        t = populated_template_manager.load_template("test_template")
        assert t is not None
        assert t.id == "test_template"
        assert t.name == "Test Template"

    def test_load_nonexistent(self, template_manager):
        """Loading a non-existent template returns None."""
        t = template_manager.load_template("does_not_exist")
        assert t is None


class TestTemplateManagerListTemplates:
    def test_list_all(self, populated_template_manager):
        """List all templates across categories."""
        templates = populated_template_manager.list_templates()
        # Our populated manager has one template
        assert len(templates) == 1
        assert templates[0].id == "test_template"

    def test_list_empty(self, template_manager):
        """Empty template directory returns empty list."""
        templates = template_manager.list_templates()
        assert templates == []

    def test_list_by_category(self, populated_template_manager):
        """Filter by category returns only templates in that category."""
        # Add a template in 'blank' category
        blank_template = Template(
            id="blank_test",
            name="Blank",
            description="Blank template",
            category="blank",
            tex_content="",
            variables={},
            created_at="2025-01-01",
            updated_at="2025-01-01",
        )
        # Determine the actual template_dir from the populated manager
        mgr = populated_template_manager
        dest = mgr.template_dir / "blank" / "blank_test.json"
        with open(dest, "w") as f:
            json.dump(blank_template.model_dump(), f, indent=2)

        # Now list by category
        professional_templates = mgr.list_templates(category="professional")
        assert len(professional_templates) == 1
        assert professional_templates[0].id == "test_template"

        blank_templates = mgr.list_templates(category="blank")
        assert len(blank_templates) == 1
        assert blank_templates[0].id == "blank_test"

        # Non-existent category returns empty
        nonexistent = mgr.list_templates(category="nonexistent")
        assert nonexistent == []


class TestTemplateManagerFillTemplate:
    def test_fill_simple(self, populated_template_manager):
        """Filling a template replaces {{variables}} with values."""
        result = populated_template_manager.fill_template(
            "test_template",
            {"name": "Alice", "role": "Developer"},
        )
        assert "Name: Alice" in result
        assert "Role: Developer" in result
        # Original placeholders should be gone
        assert "{{name}}" not in result
        assert "{{role}}" not in result

    def test_fill_partial(self, populated_template_manager):
        """Unfilled variables keep their {{placeholder}}."""
        result = populated_template_manager.fill_template(
            "test_template",
            {"name": "Bob"},
        )
        assert "Name: Bob" in result
        # role was not provided, so {{role}} remains
        assert "{{role}}" in result

    def test_fill_nonexistent_raises(self, template_manager):
        """Filling a non-existent template raises ValueError."""
        with pytest.raises(ValueError, match="not found"):
            template_manager.fill_template("ghost", {})

    def test_fill_empty_data(self, populated_template_manager):
        """Empty data dict replaces nothing."""
        result = populated_template_manager.fill_template("test_template", {})
        assert "{{name}}" in result
        assert "{{role}}" in result

    def test_fill_with_special_chars(self, populated_template_manager):
        """Special characters in values are passed through literally."""
        result = populated_template_manager.fill_template(
            "test_template",
            {"name": "John & Jane <dev>", "role": "Full-Stack Developer"},
        )
        assert "John & Jane <dev>" in result
        assert "Full-Stack Developer" in result


class TestTemplateManagerCreateDefaults:
    def test_create_defaults_creates_files(self, template_manager):
        """create_default_templates() writes template JSON files."""
        # Before: no files
        json_files = list(template_manager.template_dir.rglob("*.json"))
        assert len(json_files) == 0

        template_manager.create_default_templates()

        # After: files exist
        json_files = list(template_manager.template_dir.rglob("*.json"))
        assert len(json_files) > 0

    def test_create_defaults_loadable(self, template_manager):
        """Templates written by create_default_templates() can be loaded back."""
        template_manager.create_default_templates()

        t1 = template_manager.load_template("modern_professional")
        assert t1 is not None
        assert t1.name == "Modern Professional"

        t2 = template_manager.load_template("classic_elegant")
        assert t2 is not None
        assert t2.name == "Classic Elegant"

        t3 = template_manager.load_template("cover_letter_standard")
        assert t3 is not None
        assert t3.name == "Professional Cover Letter"
        assert t3.category == "cover-letter"

    def test_create_defaults_variables_preserved(self, template_manager):
        """Template variables survive a save-load roundtrip."""
        template_manager.create_default_templates()
        t = template_manager.load_template("modern_professional")
        assert t is not None
        assert "name" in t.variables
        assert "summary" in t.variables
        assert t.variables["summary"].type == "multiline"


class TestTemplateManagerEdgeCases:
    def test_corrupt_json_skipped(self, template_manager):
        """A corrupt JSON file is silently skipped."""
        (template_manager.template_dir / "professional").mkdir(parents=True, exist_ok=True)
        bad_file = template_manager.template_dir / "professional" / "corrupt.json"
        bad_file.write_text("this is not json")

        templates = template_manager.list_templates()
        assert templates == []

    def test_missing_category_directory(self, template_manager):
        """Listing a non-existent category returns empty list."""
        templates = template_manager.list_templates(category="nonexistent")
        assert templates == []

    def test_custom_template_dir(self, tmp_path):
        """TemplateManager works with a custom base path."""
        custom = tmp_path / "my_templates"
        mgr = TemplateManager(template_dir=str(custom))
        assert custom.exists()
        assert (custom / "professional").exists()

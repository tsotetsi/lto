"""Tests for service functions in services.py."""

import pytest

from services import (
    ResumeRequest,
    cleanup_files,
    validate_latex_file,
)


class TestResumeRequest:
    def test_minimal(self):
        """Minimal ResumeRequest requires only tex_content."""
        req = ResumeRequest(tex_content="Hello")
        assert req.tex_content == "Hello"
        assert req.file_name == "resume"  # default
        assert req.font == "Liberation Sans"  # default

    def test_custom_values(self):
        """All fields can be overridden."""
        req = ResumeRequest(
            tex_content=r"\documentclass{article}",
            file_name="my_cv",
            font="Times New Roman",
        )
        assert req.file_name == "my_cv"
        assert req.font == "Times New Roman"

    def test_tex_content_empty(self):
        """Empty string is allowed (validation happens elsewhere)."""
        req = ResumeRequest(tex_content="")
        assert req.tex_content == ""


class TestValidateLatexFile:
    def test_valid_document(self, sample_tex_content):
        """A document with all required elements passes."""
        issues = validate_latex_file(sample_tex_content)
        assert issues == []

    def test_missing_documentclass(self):
        """Missing \\documentclass is reported."""
        content = (
            r"\begin{document}" "\n"
            r"Hello" "\n"
            r"\end{document}" "\n"
        )
        issues = validate_latex_file(content)
        assert "Missing \\documentclass" in issues

    def test_missing_begin_document(self):
        """Missing \\begin{document} is reported."""
        content = (
            r"\documentclass[a4paper]{article}" "\n"
            r"\end{document}" "\n"
        )
        issues = validate_latex_file(content)
        assert "Missing \\begin{document}" in issues

    def test_missing_end_document(self):
        """Missing \\end{document} is reported."""
        content = (
            r"\documentclass[a4paper]{article}" "\n"
            r"\begin{document}" "\n"
            r"Hello" "\n"
        )
        issues = validate_latex_file(content)
        assert "Missing \\end{document}" in issues

    def test_all_missing(self):
        """Empty content reports all three issues."""
        issues = validate_latex_file("")
        assert len(issues) == 3
        assert "Missing \\documentclass" in issues
        assert "Missing \\begin{document}" in issues
        assert "Missing \\end{document}" in issues

    def test_case_sensitive(self):
        """Commands are case-sensitive."""
        content = (
            r"\Documentclass[a4paper]{article}" "\n"
            r"\begin{document}" "\n"
            r"Hello" "\n"
            r"\end{document}" "\n"
        )
        issues = validate_latex_file(content)
        assert "Missing \\documentclass" in issues  # because \Documentclass != \documentclass


class TestCleanupFiles:
    def test_removes_directory(self, tmp_path):
        """cleanup_files removes the specified directory tree."""
        test_dir = tmp_path / "to_clean"
        test_dir.mkdir()
        (test_dir / "file.tex").write_text("content")
        (test_dir / "subdir").mkdir()

        assert test_dir.exists()
        cleanup_files(test_dir)
        assert not test_dir.exists()

    def test_non_existent_path(self, tmp_path):
        """cleanup_files does not raise on non-existent path."""
        missing = tmp_path / "does_not_exist"
        # Should not raise
        cleanup_files(missing)

    def test_removes_deeply_nested(self, tmp_path):
        """Removes directory with nested structure."""
        test_dir = tmp_path / "deep"
        sub = test_dir / "a" / "b" / "c"
        sub.mkdir(parents=True)
        (sub / "readme.md").write_text("data")

        assert test_dir.exists()
        cleanup_files(test_dir)
        assert not test_dir.exists()

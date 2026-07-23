"""Shared service functions used by multiple routers."""
from __future__ import annotations

import shutil
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING

import structlog
from fastapi import BackgroundTasks, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel

if TYPE_CHECKING:
    from fastapi import BackgroundTasks

logger = structlog.get_logger("lto-services")

# Temporary directory for compilation
TEMP_DIR = Path("/tmp/cv_builds")
TEMP_DIR.mkdir(exist_ok=True)


class ResumeRequest(BaseModel):
    """Payload for LaTeX compilation requests."""
    tex_content: str
    file_name: str = "resume"
    font: str = "Liberation Sans"  # Default font.


def cleanup_files(temp_path: Path) -> None:
    """Remove the directory created for a specific compilation job."""
    if temp_path.exists():
        shutil.rmtree(temp_path)


def validate_latex_file(content: str) -> list[str]:
    """Basic LaTeX validation."""
    checks = [
        ("\\documentclass" in content, "Missing \\documentclass"),
        ("\\begin{document}" in content, "Missing \\begin{document}"),
        ("\\end{document}" in content, "Missing \\end{document}"),
    ]
    return [msg for check, msg in checks if not check]


async def compile_latex(request: ResumeRequest, background_tasks: BackgroundTasks) -> FileResponse:
    """
    Compile LaTeX source to PDF.

    Parameters
    ----------
    request : ResumeRequest
        LaTeX content and compilation options.
    background_tasks : BackgroundTasks
        FastAPI utility to schedule post-response cleanup.

    Returns
    -------
    FileResponse
        PDF file streamed to the client.

    Raises
    ------
    HTTPException
        On validation or compilation failure.
    """
    # 0. Validate the LaTeX content
    validation_issues = validate_latex_file(request.tex_content)
    if validation_issues:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid LaTeX document: {', '.join(validation_issues)}",
        )

    # 1. Create a unique workspace for this request
    job_id = str(uuid.uuid4())
    job_dir = TEMP_DIR / job_id
    job_dir.mkdir()

    # 2. Inject the font configuration into the LaTeX preamble
    font_injection = f"\\usepackage{{fontspec}}\n\\setmainfont{{{request.font}}}\n"
    content = request.tex_content

    if "\\documentclass" in content:
        # Split after \documentclass[…]{…} and insert font code right after it
        parts = content.split("\\documentclass", 1)
        end_of_header = parts[1].find("}") + 1
        final_tex = (
            "\\documentclass"
            + parts[1][:end_of_header]
            + "\n"
            + font_injection
            + parts[1][end_of_header:]
        )
    else:
        final_tex = font_injection + content

    tex_file_path = job_dir / f"{request.file_name}.tex"
    pdf_file_path = job_dir / f"{request.file_name}.pdf"

    # 3. Write the LaTeX content to file
    try:
        tex_file_path.write_text(final_tex, encoding="utf-8")
    except Exception as exc:
        cleanup_files(job_dir)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_REQUEST,
            detail=f"Failed to write file: {exc}",
        ) from exc

    # 4. Run XeLaTeX
    try:
        logger.info("Starting XeLaTeX compilation", font=request.font, job_id=job_id)
        process = subprocess.run(
            ["xelatex", "-interaction=nonstopmode", f"{request.file_name}.tex"],
            cwd=job_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=60,
        )

        if process.returncode != 0:
            # Extract last 1 000 chars from the log for the error message
            log_content = ""
            log_path = job_dir / f"{request.file_name}.log"
            if log_path.exists():
                log_content = log_path.read_text(encoding="utf-8", errors="ignore")[-1000:]
            cleanup_files(job_dir)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"LaTeX Error: {log_content}",
            )

    except subprocess.TimeoutExpired:
        logger.error("XeLaTeX compilation timed out", job_id=job_id)
        cleanup_files(job_dir)
        raise HTTPException(status_code=status.HTTP_408_REQUEST_TIMEOUT, detail="Compilation timed out")

    # 5. Ensure a PDF was produced
    if not pdf_file_path.exists():
        background_tasks.add_task(cleanup_files, job_dir)
        return {"message": "Document blank: No content to compile"}  # type: ignore[return-value]

    # 6. Schedule cleanup and return the file
    background_tasks.add_task(cleanup_files, job_dir)
    return FileResponse(
        path=pdf_file_path,
        media_type="application/pdf",
        filename=f"{request.file_name}.pdf",
    )
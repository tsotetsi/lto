from datetime import datetime, timezone
from pathlib import Path

import uuid
import subprocess
import shutil
import structlog

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager


from utils.logging import setup_logging

setup_logging()

logger = structlog.get_logger("lto-api")

tags_metadata = [  # For API documentation.
    {
        "name": "LTO Resume API",
        "description": "A platform for compiling LTO resumes using LaTeX.",
    }
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up...")
    yield
    logger.info("Shutting down...")

app = FastAPI(
    title="LTO Resume API.",
    description="LTO Resume API.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    date=datetime.now(timezone.utc),
    openapi_tags=tags_metadata,
    contact={
        "name": "Thapelo Tsotetsi",
        "email": "thapelotsotetsi2030@gmail.com",
        "url": "https://tsotetsi.github.io",
    },
    license_info={
        "name": "Apache 2.0",
        "url": "https://www.apache.org/licenses/LICENSE-2.0",
    },
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Request logging middleware.
@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

    structlog.contextvars.bind_contextvars(
        request_id=request_id,
        method=request.method,
        path=request.url.path,
    )

    response = await call_next(request)

    response.headers["X-Request-ID"] = request_id
    structlog.contextvars.clear_contextvars()

    return response


# Temporary directory for compilation
TEMP_DIR = Path("/tmp/cv_builds")
TEMP_DIR.mkdir(exist_ok=True)

class ResumeRequest(BaseModel):
    tex_content: str
    file_name: str = "resume"
    font: str = "Liberation Sans" # Default font.

def cleanup_files(temp_path: Path):
    """Removes the directory created for a specific compilation job."""
    if temp_path.exists():
        shutil.rmtree(temp_path)

def validate_latex_file(content): 
    """Basic LaTeX validation"""
    checks = [
        ("\\documentclass" in content, "Missing \\documentclass"),
        ("\\begin{document}" in content, "Missing \\begin{document}"),
        ("\\end{document}" in content, "Missing \\end{document}"),
    ] 

    issues = [msg for check, msg in checks if not check] 
    return issues

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/compile")
async def compile_latex(request: ResumeRequest, background_tasks: BackgroundTasks):
    # 0. Validate the LaTeX content
    validation_issues = validate_latex_file(request.tex_content)
    if validation_issues:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid LaTeX document: {', '.join(validation_issues)}"
        )

    # 1. Create a unique workspace for this request
    job_id = str(uuid.uuid4())
    job_dir = TEMP_DIR / job_id
    job_dir.mkdir()

    # 1. Inject the font configuration into the LaTeX preamble
    # We use fontspec (required for XeLaTeX) to set the main font
    font_injection = f"\\usepackage{{fontspec}}\n\\setmainfont{{{request.font}}}\n"

    # If the user already has \documentclass, we insert after it.
    # Otherwise, we just prepend (though documentclass is required).
    content = request.tex_content
    if "\\documentclass" in content:
        parts = content.split("\\documentclass", 1)
        # Reconstruct: \documentclass + [options] + {class} + font_injection + rest
        # We find the end of the \documentclass line
        end_of_header = parts[1].find("}") + 1
        final_tex = "\\documentclass" + parts[1][:end_of_header] + "\n" + font_injection + parts[1][end_of_header:]
    else:
        final_tex = font_injection + content

    tex_file_path = job_dir / f"{request.file_name}.tex"
    pdf_file_path = job_dir / f"{request.file_name}.pdf"

    # 2. Write the LaTeX content to file
    try:
        with open(tex_file_path, "w") as f:
            f.write(final_tex)
    except Exception as e:
        cleanup_files(job_dir)
        raise HTTPException(status_code=500, detail=f"Failed to write file: {str(e)}")

    # 3. Run XeLaTeX
    # Note: We run it twice for references/page numbers if necessary
    try:
        import logging
        logging.basicConfig(level=logging.INFO)
        logger = logging.getLogger(__name__)
        logger.info(f"Starting XeLaTeX compilation for font: {request.font}")
        process = subprocess.run(
            ["xelatex", "-interaction=nonstopmode", f"{request.file_name}.tex"],
            cwd=job_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=60  # Increased timeout to 60 seconds
        )

        if process.returncode != 0:
            # Extract error from logs if compilation fails
            log_content = ""
            log_path = job_dir / f"{request.file_name}.log"
            if log_path.exists():
                log_content = log_path.read_text(errors='ignore')[-1000:] # Last 1000 chars

            cleanup_files(job_dir)
            raise HTTPException(status_code=400, detail=f"LaTeX Error: {log_content}")

    except subprocess.TimeoutExpired:
        logger.error("XeLaTeX compilation timed out after 60 seconds")
        cleanup_files(job_dir)
        raise HTTPException(status_code=408, detail="Compilation timed out")

    # 4. Check if PDF was generated
    if not pdf_file_path.exists():
        # Schedule cleanup and return a message
        background_tasks.add_task(cleanup_files, job_dir)
        return {"message": "Document blank: No content to compile"}

    # 5. Schedule cleanup and return the file
    background_tasks.add_task(cleanup_files, job_dir)

    return FileResponse(
        path=pdf_file_path,
        media_type='application/pdf',
        filename=f"{request.file_name}.pdf"
    )
from datetime import datetime, timezone
from pathlib import Path
import uuid
import structlog

from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import get_settings
from utils.logging import setup_logging
from services import compile_latex, ResumeRequest
from templates.router import router as tmpl_router

# Resumes router requires DB — import lazily so the app starts without Postgres.
try:
    from resumes.router import router as snippets_router
except Exception:
    snippets_router = None


setup_logging()

logger = structlog.get_logger("lto-api")

tags_metadata = [
    {
        "name": "Lethathamo API",
        "description": "LaTeX resume & cover letter compiler.",
    }
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up...")
    settings = get_settings()
    logger.debug("Configuration loaded", db_url=settings.DATABASE_URL)
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Lethathamo API",
    description="LaTeX resume & cover letter compiler.",
    version="0.1.0",
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(tmpl_router, prefix="")
if snippets_router is not None:
    app.include_router(snippets_router, prefix="/api")


# Request logging middleware
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


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/compile/raw")
async def compile_raw_latex(
    request: ResumeRequest,
    background_tasks: BackgroundTasks,
):
    """Compile raw LaTeX content and return the resulting PDF."""
    return await compile_latex(request, background_tasks)
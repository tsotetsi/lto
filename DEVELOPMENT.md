# Development Guide

> Everything you need to know to run, build, and debug the LTO platform locally using Docker.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Docker Workflow](#docker-workflow)
- [Hot Reload](#hot-reload)
- [Useful Commands](#useful-commands)
- [Secrets Management](#secrets-management)
- [Troubleshooting](#troubleshooting)
- [Production Build](#production-build)
- [Monitoring Stack](#monitoring-stack)

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Docker Engine | 24+ | Install from [docker.com](https://docs.docker.com/engine/install/) |
| Docker Compose | v2 (built-in) | Included with Docker Desktop / Docker Engine |
| Git | latest | For cloning and version control |
| OpenSSL | any | Needed to generate secret values |

---

## Quick Start

### 1. Clone and enter the project

```bash
git clone <repo-url>
cd lto
```

### 2. Create secrets

The project uses Docker secrets for sensitive values. Create them in `.secrets/` (gitignored):

```bash
mkdir -p .secrets

# Write meaningful **usernames** (not random strings):
echo "lto_postgres_user"  > .secrets/postgres_user.txt    # Postgres system user
echo "lto_app"           > .secrets/lto_app_user.txt      # Backend DB user
echo "healthcheck_user"  > .secrets/healthcheck_user.txt  # Health check user

# Generate random **passwords** using make:
make openssl > .secrets/postgres_password.txt
make openssl > .secrets/lto_app_password.txt
make openssl > .secrets/healthcheck_password.txt
make openssl > .secrets/secret_key.txt
```

> **Important:** Usernames should be simple identifiers (e.g. `lto_app`), not random strings. Only use `make openssl` for passwords and secret keys.

### 3. Configure frontend API URL

The frontend needs to know where the backend lives. Create a local env file:

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > frontend/.env.local
```

> This file is gitignored (`frontend/.env.local` is in `.gitignore`).

### 4. Build and start everything

> **First build takes 10–15 minutes** — it downloads the full TeX Live distribution (~800 MB) and Microsoft Core Fonts. Subsequent builds use Docker cache and complete in seconds.

```bash
docker compose up -d --build
```

This builds and starts all services:
- **Postgres** (database)
- **Backend** (FastAPI + LaTeX compiler)
- **Frontend** (Next.js)
- **Loki** (log aggregation)
- **Alloy** (log collector)
- **Grafana** (log/metrics UI)

### 5. Run database migrations

Once the backend is healthy, apply Alembic migrations to set up the database schema:

```bash
docker compose exec backend alembic upgrade head
```

> **Note:** This only needs to be done once, or whenever new migrations are added.

### 6. Verify it's running

```bash
# Check all services
docker compose ps

# Test backend health
curl http://localhost:8000/health
# → {"status":"healthy"}

# Open frontend
open http://localhost:3000
```

### 7. Compile a test PDF

```bash
# Python test script
python3 /tmp/test_compile.py

# Or use curl
curl -s -X POST http://localhost:8000/compile/raw \
  -H "Content-Type: application/json" \
  -d '{
    "tex_content": "\\documentclass[a4paper]{article}\\n\\begin{document}\\nHello World\\n\\end{document}",
    "file_name": "test",
    "font": "Liberation Sans"
  }' --output test.pdf
```

---

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│  Frontend   │────▶│   Backend    │────▶│  Postgres  │
│  :3000      │     │  :8000       │     │  :5432     │
│  Next.js    │     │  FastAPI     │     │            │
│  Monaco     │     │  XeLaTeX     │     │            │
└─────────────┘     └──────┬───────┘     └────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    Loki      │
                    │  :3100       │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │   Alloy      │
                    │  (collector) │
                    └──────────────┘
                           │
                    ┌──────▼───────┐
                    │   Grafana    │
                    │  :9090       │
                    └──────────────┘
```

### Service Ports

| Port | Service | URL |
|------|---------|-----|
| 3000 | Frontend (Next.js) | http://localhost:3000 |
| 8000 | Backend (FastAPI) | http://localhost:8000 |
| 5432 | Postgres | localhost:5432 |
| 3100 | Loki | http://localhost:3100 |
| 9090 | Grafana | http://localhost:9090 |

---

## Docker Workflow

### Building

```bash
# Build everything
docker compose build

# Build a single service
docker compose build backend
docker compose build frontend

# Build without cache (clean rebuild)
docker compose build --no-cache backend
```

> **Build context notes:**
> - Backend: ~15 KB (thanks to `.dockerignore`)
> - Frontend: ~1 KB (thanks to `.dockerignore`)
> - Fast builds with minimal context transfer.

### Running

```bash
# Start all services
docker compose up -d

# Start specific services
docker compose up -d backend frontend

# Start with rebuild
docker compose up -d --build frontend

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Follow multiple services
docker compose logs -f backend frontend
```

### Stopping

```bash
# Stop all services (preserves data volumes)
docker compose down

# Stop and delete volumes (wipes database)
docker compose down -v

# Stop a single service
docker compose rm -fsv frontend
```

### Updating after pulling changes

If `package.json`, `requirements/*.txt`, or `Dockerfile` changed, rebuild:

```bash
# Frontend dependency change
docker compose up -d --build frontend

# Backend dependency change
docker compose up -d --build backend

# Everything
docker compose up -d --build
```

If only Python/TypeScript source code changed, no rebuild needed — hot reload handles it (see below).

---

## Hot Reload

Both the backend and frontend support **hot reload** through Docker bind mounts. Edit code on your host and see changes reflected immediately without rebuilding images.

### Backend (FastAPI + uvicorn)

| Mechanism | Detail |
|-----------|--------|
| Watcher | uvicorn `--reload` (uses `watchfiles` library) |
| Polling | `WATCHFILES_FORCE_POLLING=true` (env var) |
| Mount | `./backend:/app` (bind mount in compose) |

**How it works:**
1. Edit any `.py` file in `backend/`
2. The Docker bind mount syncs the change to the container
3. `watchfiles` detects the change via polling
4. uvicorn reloads the server (takes ~1-2 seconds)

**What triggers a reload:**
- All `.py` files in `backend/`
- Does **not** require rebuilding the Docker image

### Frontend (Next.js + Turbopack)

| Mechanism | Detail |
|-----------|--------|
| Bundler | Next.js 16 with **Turbopack** (native HMR) |
| Polling | `CHOKIDAR_USEPOLLING=true` + `WATCHPACK_POLLING=true` |
| Mount | `./frontend:/app` (bind mount in compose) |
| Node modules | Anonymous volume `/app/node_modules` (preserved from image) |
| Build cache | Anonymous volume `/app/.next` (preserved across restarts) |

**How it works:**
1. Edit any file in `frontend/src/`
2. The Docker bind mount syncs the change to the container
3. Turbopack detects the change via polling
4. Only the changed module(s) are recompiled
5. Browser updates via HMR (no full reload)

**What triggers HMR:**
- `.ts`, `.tsx`, `.js`, `.jsx`, `.css` files in `frontend/src/`
- Does **not** trigger a full page reload in most cases

### When to rebuild vs. hot reload

| Change type | Action |
|-------------|--------|
| Python source (`.py`) | ✅ Hot reload (no build needed) |
| TypeScript/React (`.tsx`) | ✅ Hot reload (no build needed) |
| CSS/Tailwind | ✅ Hot reload (no build needed) |
| New npm package (`package.json`) | 🔄 Rebuild: `docker compose up -d --build frontend` |
| New pip package (`requirements/*.txt`) | 🔄 Rebuild: `docker compose up -d --build backend` |
| Dockerfile change | 🔄 Rebuild |
| `.dockerignore` change | 🔄 Rebuild |

---

## Useful Commands

### Makefile targets

```bash
make help             # Show all available commands
make build-up         # Build and start backend + frontend
make backend-up       # Start all services
make backend-down     # Stop all services
make logs service=X   # Follow logs for a service (e.g., service=backend)
make clean            # Stop everything and remove volumes
make openssl          # Generate a random password
```

### Docker Compose (without Makefile)

```bash
# Status
docker compose ps
docker compose top

# Logs
docker compose logs -f backend
docker compose logs --tail 100 frontend

# Execute inside a container
docker compose exec backend bash
docker compose exec frontend sh

# Resource usage
docker stats
```

### Health checks

```bash
# Backend health
curl http://localhost:8000/health

# Frontend health
curl -o /dev/null -w '%{http_code}' http://localhost:3000

# Postgres health (from host)
pg_isready -h localhost -p 5432
```

---

## Secrets Management

The project uses [Docker secrets](https://docs.docker.com/engine/swarm/secrets/) for sensitive configuration. All secrets are stored as plaintext files in `.secrets/` (gitignored).

### Required secrets

| Secret file | Used by | Purpose |
|-------------|---------|---------|
| `.secrets/postgres_user.txt` | Postgres, Backend | Postgres application user |
| `.secrets/postgres_password.txt` | Postgres, Backend | Postgres application password |
| `.secrets/lto_app_user.txt` | Backend | Backend DB connection user |
| `.secrets/lto_app_password.txt` | Backend | Backend DB connection password |
| `.secrets/secret_key.txt` | Backend | FastAPI secret key (sessions, CSRF) |
| `.secrets/healthcheck_user.txt` | Postgres | Health check DB user |
| `.secrets/healthcheck_password.txt` | Postgres | Health check DB password |

### Creating secrets

```bash
# Generate random values
make openssl > .secrets/my_secret.txt

# Or write specific values
echo "my_custom_value" > .secrets/lto_app_user.txt
```

### How secrets work in Docker Compose

Secrets are mounted at `/run/secrets/<name>` inside each container. The backend reads them using Pydantic's `secrets_dir` feature:

```python
# backend/config.py
POSTGRES_USER: str = Field("lto_postgres_user", validation_alias="POSTGRES_USER_FILE")
# Reads from /run/secrets/postgres_user
```

---

## Troubleshooting

### Container crashes / restart loop

```bash
# Check logs
docker compose logs --tail 50 frontend

# Common fix: recreate container
docker compose rm -fsv frontend
docker compose up -d --build frontend
```

### Frontend not accessible

```bash
# Verify container is running
docker compose ps frontend

# Check if port is bound
ss -tlnp | grep 3000

# Check logs for errors
docker compose logs frontend --tail 50
```

### Backend not healthy

```bash
# Check if Postgres is healthy first
docker compose ps storage-postgres

# Check backend logs
docker compose logs backend --tail 50

# Manually test health
curl http://localhost:8000/health

# Restart backend
docker compose restart backend
```

### LaTeX compilation fails

```bash
# Check backend logs for XeLaTeX output
docker compose logs backend --tail 100

# Verify fonts are installed
docker compose exec backend fc-list | grep -i "times new roman\|fontin"

# Test with a minimal document via the test script
python3 /tmp/test_compile.py
```

### Hot reload not working

```bash
# Backend: verify env var is set
docker compose exec backend env | grep WATCHFILES

# Frontend: verify env vars are set
docker compose exec frontend env | grep -E "CHOKIDAR|WATCHPACK"

# Check that volumes are mounted correctly
docker inspect lto-frontend-1 | jq '.[].Mounts'
```

### "No space left on device" / Docker disk full

```bash
# Clean unused images and build cache
docker system prune -a

# Specifically remove dangling build cache
docker builder prune

# Remove old containers and volumes
docker compose down -v
```

### Port conflict

If port 3000 or 8000 is already in use:

```bash
# Find what's using the port
ss -tlnp | grep -E "3000|8000"

# Or change the host port in docker-compose.yml:
#   ports:
#     - "3001:3000"   # maps host 3001 → container 3000
```

---

## Production Build

The frontend Dockerfile has a `runner` stage for production:

```bash
# Build production image
docker build --target runner -t lto-frontend:prod frontend/

# Run production container
docker run -d -p 3000:3000 lto-frontend:prod
```

The backend Dockerfile produces a production-ready image by default (the `--reload` flag in CMD should be removed for production).

Production considerations:
- Set `ENVIRONMENT=production` in compose environment
- Remove `--reload` from backend CMD
- Use a reverse proxy (nginx, Caddy) for TLS termination
- Set up proper logging aggregation (Loki/Grafana stack)
- Configure database connection pooling

---

## Monitoring Stack

The project includes a full observability stack:

| Service | Purpose | Access |
|---------|---------|--------|
| **Loki** | Log aggregation | http://localhost:3100 |
| **Alloy** | Log collector (scrapes Docker logs) | Internal only |
| **Grafana** | Dashboard & log explorer | http://localhost:9090 |

To start only the monitoring stack:

```bash
make monitoring-up
```

### Loki volume permissions

The official `grafana/loki:latest` image runs as UID `10001` and is based on `scratch` (no shell). Docker named volumes are created as `root`, so Loki will fail to start on a fresh volume with permission errors.

Run this once after the Loki volume is first created or recreated:

```bash
make loki-setup
```

This mounts the Loki data volume in an Alpine container and `chown`s it to UID `10001`.

> **When to re-run:** After `docker compose down -v` (which deletes volumes) or after `make clean`.

Grafana is pre-configured with Loki as a data source. Access it at http://localhost:9090 with anonymous admin access.

---

## Project Structure

```
├── backend/              # FastAPI application
│   ├── main.py           # Entry point, routes, middleware
│   ├── config.py         # Pydantic settings + secrets
│   ├── database.py       # SQLAlchemy async engine
│   ├── managers.py       # Template management + defaults
│   ├── services.py       # Business logic (LaTeX compilation)
│   ├── requirements/     # Python dependencies
│   ├── templates/        # LaTeX template definitions
│   ├── resumes/          # Resume snippet CRUD (Postgres)
│   ├── fonts/            # Custom Fontin fonts
│   └── migrations/       # Alembic DB migrations
├── frontend/             # Next.js application
│   ├── src/app/          # Pages & components
│   │   ├── page.tsx      # Main editor (split-pane)
│   │   ├── template/     # Template gallery page
│   │   ├── components/   # UI components
│   │   └── context/      # React contexts (theme)
│   └── Dockerfile        # Multi-stage build
├── storage/              # Database config
├── monitoring/           # Loki + Grafana + Alloy config
├── docker-compose.yml    # Service orchestration
└── DEVELOPMENT.md        # This file
```

---

## Tips

- **First build takes ~10-15 minutes** (installing TeX Live, MS fonts). Subsequent builds use Docker cache and are much faster.
- **Press `Ctrl+C`** to detach from `docker compose logs -f` without stopping the services.
- **Use `docker compose up -d --build frontend`** for quick frontend-only rebuilds after dependency changes.
- **The `/tmp/test_compile.py` script** is a handy way to test PDF compilation without the frontend.

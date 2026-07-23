.PHONY: help up down ps rebuild logs \
	backend-build backend-up backend-down backend-logs backend-shell \
	frontend-build frontend-up frontend-down frontend-logs frontend-shell \
	db-up db-down db-shell migrate \
	monitoring-up monitoring-down loki-setup \
	setup openssl clean dev-up test test-coverage githooks-install

# Colors
GREEN  := \033[0;32m
RED    := \033[0;31m
YELLOW := \033[1;33m
NC     := \033[0m

help:
	@echo "$(YELLOW)LTO Platform — Development Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Core:$(NC)"
	@echo "  up              Start all services (db, backend, frontend, monitoring)"
	@echo "  down            Stop all services (preserves data volumes)"
	@echo "  ps              Show service status"
	@echo "  rebuild         Rebuild and restart all services"
	@echo "  dev-up          Full first-time setup (build + start all, run migrations)"
	@echo ""
	@echo "$(GREEN)Backend:$(NC)"
	@echo "  backend-build   Build backend Docker image"
	@echo "  backend-up      Start backend service only"
	@echo "  backend-down    Stop backend service"
	@echo "  backend-logs    Follow backend logs"
	@echo "  backend-shell   Open a shell in the backend container"
	@echo ""
	@echo "$(GREEN)Frontend:$(NC)"
	@echo "  frontend-build  Build frontend Docker image (dev target)"
	@echo "  frontend-up     Start frontend service only"
	@echo "  frontend-down   Stop frontend service"
	@echo "  frontend-logs   Follow frontend logs"
	@echo "  frontend-shell  Open a shell in the frontend container"
	@echo ""
	@echo "$(GREEN)Database:$(NC)"
	@echo "  db-up           Start PostgreSQL"
	@echo "  db-down         Stop PostgreSQL"
	@echo "  db-shell        Open psql in the Postgres container"
	@echo "  migrate         Run Alembic database migrations"
	@echo ""
	@echo "$(GREEN)Monitoring:$(NC)"
	@echo "  monitoring-up   Start Loki + Grafana + Alloy"
	@echo "  monitoring-down Stop monitoring stack"
	@echo "  loki-setup      Fix Loki volume permissions (run after first install or 'make clean')"
	@echo ""
	@echo "$(GREEN)Testing:$(NC)"
	@echo "  test            Run backend tests inside the container"
	@echo "  test-coverage   Run backend tests with coverage report"
	@echo ""
	@echo "$(GREEN)Git Hooks:$(NC)"
	@echo "  githooks-install Install pre-commit hooks from .githooks/"
	@echo ""
	@echo "$(GREEN)Utilities:$(NC)"
	@echo "  setup           Create required .secrets and .env.local files"
	@echo "  openssl         Generate a random 20-char password"
	@echo "  clean           Stop all services and remove data volumes"
	@echo ""

# ── Core ──────────────────────────────────────────────────────────────────────

up:
	@echo "$(YELLOW)ℹ️  Starting all services...$(NC)"
	docker compose up -d --remove-orphans
	@echo "$(GREEN)✅  All services started. Use 'make ps' to check status.$(NC)"

down:
	@echo "$(YELLOW)ℹ️  Stopping all services...$(NC)"
	docker compose down --remove-orphans
	@echo "$(GREEN)✅  Services stopped (volumes preserved).$(NC)"

ps:
	@docker compose ps

rebuild:
	@echo "$(YELLOW)ℹ️  Rebuilding and restarting all services...$(NC)"
	docker compose up -d --build --remove-orphans
	@echo "$(GREEN)✅  All services rebuilt and started.$(NC)"

logs:
	@if [ -z "$(service)" ]; then \
		echo "$(RED)❌ Please specify a service name!$(NC) Usage: make logs service=backend"; \
		exit 1; \
	fi
	@echo "$(YELLOW)📜 Showing logs for service '$(service)'...$(NC)"
	docker compose logs -f "$(service)"

# ── Backend ────────────────────────────────────────────────────────────────────

backend-build:
	@echo "$(YELLOW)ℹ️  Building backend image...$(NC)"
	docker compose build backend
	@echo "$(GREEN)✅  Backend image built.$(NC)"

backend-up:
	@echo "$(YELLOW)ℹ️  Starting backend...$(NC)"
	docker compose up -d backend --remove-orphans
	@echo "$(GREEN)✅  Backend started.$(NC)"

backend-down:
	@echo "$(YELLOW)ℹ️  Stopping backend...$(NC)"
	docker compose down backend --remove-orphans
	@echo "$(GREEN)✅  Backend stopped.$(NC)"

backend-logs:
	@docker compose logs -f backend

backend-shell:
	@docker compose exec backend bash || docker compose exec backend sh

# ── Frontend ───────────────────────────────────────────────────────────────────

frontend-build:
	@echo "$(YELLOW)ℹ️  Building frontend image (dev target)...$(NC)"
	docker compose build frontend
	@echo "$(GREEN)✅  Frontend image built.$(NC)"

frontend-up:
	@echo "$(YELLOW)ℹ️  Starting frontend...$(NC)"
	docker compose up -d frontend --remove-orphans
	@echo "$(GREEN)✅  Frontend started.$(NC)"

frontend-down:
	@echo "$(YELLOW)ℹ️  Stopping frontend...$(NC)"
	docker compose down frontend --remove-orphans
	@echo "$(GREEN)✅  Frontend stopped.$(NC)"

frontend-logs:
	@docker compose logs -f frontend

frontend-shell:
	@docker compose exec frontend sh

# ── Database ───────────────────────────────────────────────────────────────────

db-up:
	@echo "$(YELLOW)ℹ️  Starting PostgreSQL...$(NC)"
	docker compose up -d storage-postgres --remove-orphans
	@echo "$(GREEN)✅  PostgreSQL started.$(NC)"

db-down:
	@echo "$(YELLOW)ℹ️  Stopping PostgreSQL...$(NC)"
	docker compose down storage-postgres --remove-orphans
	@echo "$(GREEN)✅  PostgreSQL stopped.$(NC)"

db-shell:
	@docker compose exec storage-postgres psql -U lto_postgres_user -d lto

migrate:
	@echo "$(YELLOW)ℹ️  Running Alembic migrations...$(NC)"
	docker compose exec backend alembic upgrade head
	@echo "$(GREEN)✅  Migrations applied.$(NC)"

# ── Monitoring ─────────────────────────────────────────────────────────────────

monitoring-up:
	@echo "$(YELLOW)ℹ️  Starting monitoring stack (Loki, Grafana, Alloy)...$(NC)"
	docker compose up -d loki grafana alloy --remove-orphans
	@echo "$(GREEN)✅  Monitoring stack started.$(NC)"

monitoring-down:
	@echo "$(YELLOW)ℹ️  Stopping monitoring stack...$(NC)"
	docker compose down loki grafana alloy --remove-orphans
	@echo "$(GREEN)✅  Monitoring stack stopped.$(NC)"

loki-setup:
	@echo "$(YELLOW)ℹ️  Fixing Loki volume permissions...$(NC)"
	@docker run --rm -v lto_loki_data:/data alpine chown -R 10001:10001 /data 2>&1 && \
		echo "$(GREEN)✅  Loki volume permissions fixed.$(NC)" || \
		echo "$(RED)❌ Failed to fix permissions. Is Docker running?$(NC)"

# ── Utilities ──────────────────────────────────────────────────────────────────

setup:
	@echo "$(YELLOW)ℹ️  Creating .secrets directory...$(NC)"
	@mkdir -p .secrets
	@echo "$(GREEN)  → .secrets/ created$(NC)"
	@if [ ! -f .secrets/postgres_user.txt ]; then \
		echo "lto_postgres_user" > .secrets/postgres_user.txt; \
		echo "$(GREEN)  → .secrets/postgres_user.txt created$(NC)"; \
	fi
	@if [ ! -f .secrets/lto_app_user.txt ]; then \
		echo "lto_app" > .secrets/lto_app_user.txt; \
		echo "$(GREEN)  → .secrets/lto_app_user.txt created$(NC)"; \
	fi
	@if [ ! -f .secrets/healthcheck_user.txt ]; then \
		echo "healthcheck_user" > .secrets/healthcheck_user.txt; \
		echo "$(GREEN)  → .secrets/healthcheck_user.txt created$(NC)"; \
	fi
	@for secret in postgres_password lto_app_password healthcheck_password secret_key; do \
		if [ ! -f ".secrets/$$secret.txt" ]; then \
			openssl rand -base64 32 | tr -d '=+/ ' | cut -c1-20 > ".secrets/$$secret.txt"; \
			echo "$(GREEN)  → .secrets/$$secret.txt created$(NC)"; \
		fi; \
	done
	@if [ ! -f frontend/.env.local ]; then \
		echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > frontend/.env.local; \
		echo "$(GREEN)  → frontend/.env.local created$(NC)"; \
	fi
	@echo "$(GREEN)✅  Setup complete. Edit .secrets/*.txt if you need custom values.$(NC)"

openssl:
	@openssl rand -base64 32 | tr -d '=+/ ' | cut -c1-20

clean:
	@echo "$(YELLOW)⚠️  This will remove all containers AND data volumes!$(NC)"
	@echo "Continue? [y/N] "; \
	read -r ans; \
	if [ "$$ans" = "y" ] || [ "$$ans" = "Y" ]; then \
		docker compose down -v --remove-orphans; \
		echo "$(GREEN)✅  Cleaned.$(NC)"; \
	else \
		echo "$(RED)❌ Cancelled.$(NC)"; \
	fi

test:
	@echo "$(YELLOW)ℹ️  Running backend tests...$(NC)"
	docker compose exec -u appuser backend python -m pytest tests/ -v
	@echo "$(GREEN)✅  Tests complete.$(NC)"

test-coverage:
	@echo "$(YELLOW)ℹ️  Running backend tests with coverage...$(NC)"
	docker compose exec -u appuser backend python -m pytest tests/ -v --cov
	@echo "$(GREEN)✅  Coverage report generated.$(NC)"

githooks-install:
	@echo "$(YELLOW)ℹ️  Installing git hooks from .githooks/...$(NC)"
	git config core.hooksPath .githooks
	@echo "$(GREEN)✅  Git hooks installed. Pre-commit tests will run on every 'git commit'.$(NC)"
	@echo "  To bypass: SKIP_TESTS=1 git commit"

dev-up:
	@echo "$(YELLOW)ℹ️  Full development setup...$(NC)"
	@echo "$(YELLOW)  1. Building and starting all services...$(NC)"
	docker compose up -d --build --remove-orphans
	@echo "$(YELLOW)  2. Waiting for backend health check...$(NC)"
	@sleep 10
	@echo "$(YELLOW)  3. Running database migrations...$(NC)"
	docker compose exec -T backend alembic upgrade head 2>/dev/null || \
		echo "$(YELLOW)  ⚠️  Migrations skipped (not ready yet). Run 'make migrate' later.$(NC)"
	@echo "$(GREEN)✅  Dev environment ready!$(NC)"
	@echo "   Frontend: http://localhost:3000"
	@echo "   Backend:  http://localhost:8000"
	@echo "   Docs:     See DEVELOPMENT.md for more commands."

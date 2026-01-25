.PHONY: help install backend-up backend-down postgres-up postgres-down redis-up redis-down loki-up loki-down grafana-up grafana-down promtail-up promtail-down clean

# Variables
PIP3 := pip3
PYTEST := pytest3

# Colors
GREEN := \033[0;32m
RED := \033[0;31m
YELLOW := \033[1;33m
NC := \033[0m # No Color

help:
	@echo "LTO Platform Development Commands:"
	@echo ""
	@echo "  install		   - Install dependencies"
	@echo "  test              - Run all tests"
	@echo "  unit              - Run unit tests with coverage"
	@echo "  backend-up        - Start backend"
	@echo "  backend-down      - Stop backend"
	@echo "  postgres-up       - Start Postgres stack"
	@echo "  postgres-down     - Stop Postgres stack"
	@echo "  redis-up          - Start Redis stack"
	@echo "  redis-down        - Stop Redis stack"
	@echo "  loki-up           - Start Loki stack"
	@echo "  loki-down         - Stop Loki stack"
	@echo "  grafana-up        - Start Grafana stack"
	@echo "  grafana-down      - Stop Grafana stack"
	@echo "  promtail-up       - Start Promtail stack"
	@echo "  promtail-down     - Stop Promtail stack"
	@echo "  clean             - Clean temporary files"
	@echo ""

install:
	@echo "$(YELLOW)ℹ️  Installing dependencies...$(NC)"
	cd backend && $(PIP3) install -r requirements/production.txt
	@echo "$(GREEN)✅  Dependencies installed..$(NC)"
	@pip3 freeze

unit:
	@echo "$(YELLOW)ℹ️  Running unit tests...$(NC)"
	cd backend && $(PYTEST) --cov=app --cov-report=term-missing -m "unit"
	@echo "$(GREEN)✅  Unit tests passed..$(NC)"

backend-up:
	@echo "$(YELLOW)ℹ️  Starting backend...$(NC)"
	docker-compose -f docker-compose.yml up -d
	@echo "$(GREEN)✅  Backend started..$(NC)"

backend-down:
	@echo "$(YELLOW)ℹ️  Stopping backend...$(NC)"
	docker-compose -f docker-compose.yml down
	@echo "$(GREEN)✅  Backend stopped..$(NC)"

postgres-up:
	@echo "$(YELLOW)ℹ️  Starting Postgres...$(NC)"
	docker-compose -f docker-compose.yml up -d postgres
	@echo "$(GREEN)✅  Postgres started..$(NC)"

postgres-down:
	@echo "$(YELLOW)ℹ️  Stopping Postgres...$(NC)"
	docker-compose -f docker-compose.yml down postgres
	@echo "$(GREEN)✅  Postgres stopped..$(NC)"

redis-up:
	@echo "$(YELLOW)ℹ️  Starting Redis...$(NC)"
	docker-compose -f docker-compose.yml up -d redis
	@echo "$(GREEN)✅  Redis started..$(NC)"

redis-down:
	@echo "$(YELLOW)ℹ️  Stopping Redis...$(NC)"
	docker-compose -f docker-compose.yml down redis
	@echo "$(GREEN)✅  Redis stopped..$(NC)"

loki-up:
	@echo "$(YELLOW)ℹ️  Starting Loki...$(NC)"
	docker-compose -f docker-compose.yml up -d loki
	@echo "$(GREEN)✅  Loki started..$(NC)"

loki-down:
	@echo "$(YELLOW)ℹ️  Stopping Loki...$(NC)"
	docker-compose -f docker-compose.yml down loki
	@echo "$(GREEN)✅  Loki stopped..$(NC)"

grafana-up:
	@echo "$(YELLOW)ℹ️  Starting Grafana...$(NC)"
	docker-compose -f docker-compose.yml up -d grafana
	@echo "$(GREEN)✅  Grafana started..$(NC)"

grafana-down:
	@echo "$(YELLOW)ℹ️  Stopping Grafana...$(NC)"
	docker-compose -f docker-compose.yml down grafana
	@echo "$(GREEN)✅  Grafana stopped..$(NC)"

promtail-up:
	@echo "$(YELLOW)ℹ️  Starting Promtail...$(NC)"
	docker-compose -f docker-compose.yml up -d promtail
	@echo "$(GREEN)✅  Promtail started..$(NC)"

promtail-down:
	@echo "$(YELLOW)ℹ️  Stopping Promtail...$(NC)"
	docker-compose -f docker-compose.yml down promtail
	@echo "$(GREEN)✅  Promtail stopped..$(NC)"

clean:
	@echo "$(YELLOW)ℹ️  Cleaning temporary files...$(NC)"
	docker-compose -f docker-compose.yml down --volumes --remove-orphans
	@echo "$(GREEN)✅  Temporary files cleaned..$(NC)"

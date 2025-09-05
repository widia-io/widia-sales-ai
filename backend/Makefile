# Makefile for Widia Connect Backend

# Variables
BINARY_NAME=widia-api
MAIN_PATH=cmd/api/main.go

# Colors for output
GREEN=\033[0;32m
YELLOW=\033[1;33m
NC=\033[0m # No Color

.PHONY: help dev build test migrate seed clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

dev: ## Run the application in development mode
	@echo "Starting development server..."
	go run cmd/api/main.go

build: ## Build the application
	@echo "Building application..."
	go build -o bin/api cmd/api/main.go

test: ## Run tests
	@echo "Running tests..."
	go test -v ./...

migrate: ## Run database migrations
	@echo "${YELLOW}Running migrations...${NC}"
	@docker exec -i saas-postgres psql -U postgres -d saas_dev < migrations/001_create_extensions.sql
	@docker exec -i saas-postgres psql -U postgres -d saas_dev < migrations/002_create_tenants_table.sql
	@docker exec -i saas-postgres psql -U postgres -d saas_dev < migrations/003_create_users_table.sql
	@docker exec -i saas-postgres psql -U postgres -d saas_dev < migrations/004_enable_rls.sql
	@echo "${GREEN}Migrations completed${NC}"

migrate-down: ## Rollback database migrations
	@echo "${YELLOW}Rolling back migrations...${NC}"
	@docker exec -i saas-postgres psql -U postgres -d saas_dev -c "DROP TABLE IF EXISTS audit_logs CASCADE;"
	@docker exec -i saas-postgres psql -U postgres -d saas_dev -c "DROP TABLE IF EXISTS roles CASCADE;"
	@docker exec -i saas-postgres psql -U postgres -d saas_dev -c "DROP TABLE IF EXISTS refresh_tokens CASCADE;"
	@docker exec -i saas-postgres psql -U postgres -d saas_dev -c "DROP TABLE IF EXISTS users CASCADE;"
	@docker exec -i saas-postgres psql -U postgres -d saas_dev -c "DROP TABLE IF EXISTS tenants CASCADE;"
	@docker exec -i saas-postgres psql -U postgres -d saas_dev -c "DROP TYPE IF EXISTS subscription_status CASCADE;"
	@docker exec -i saas-postgres psql -U postgres -d saas_dev -c "DROP TYPE IF EXISTS user_role CASCADE;"
	@echo "${GREEN}Rollback completed${NC}"

seed: ## Seed the database with test data
	@echo "${YELLOW}Seeding database...${NC}"
	@docker exec -i saas-postgres psql -U postgres -d saas_dev < ../database/seeds/001_demo_tenant.sql
	@echo "${GREEN}Database seeded${NC}"

clean: ## Clean build artifacts
	@echo "Cleaning..."
	rm -rf bin/
	rm -f coverage.out coverage.html

install: ## Install dependencies
	@echo "Installing dependencies..."
	go mod download
	go mod tidy

lint: ## Run linter
	@echo "Running linter..."
	golangci-lint run || go vet ./...

fmt: ## Format code
	@echo "Formatting code..."
	go fmt ./...

reset-db: migrate-down migrate migrate-seed ## Reset database (drop, migrate, seed)
	@echo "${GREEN}Database reset completed${NC}"

migrate-seed: seed ## Run migrations and seed
	@echo "${GREEN}Migration and seed completed${NC}"
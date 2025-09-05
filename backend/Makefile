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
	@echo "Running migrations..."
	go run cmd/migrate/main.go up

migrate-down: ## Rollback database migrations
	@echo "Rolling back migrations..."
	go run cmd/migrate/main.go down

seed: ## Seed the database with test data
	@echo "Seeding database..."
	go run cmd/seed/main.go

clean: ## Clean build artifacts
	@echo "Cleaning..."
	rm -rf bin/

install: ## Install dependencies
	@echo "Installing dependencies..."
	go mod download
	go mod tidy

lint: ## Run linter
	@echo "Running linter..."
	golangci-lint run

fmt: ## Format code
	@echo "Formatting code..."
	go fmt ./...
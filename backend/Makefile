# Makefile for HR Portal Backend

.PHONY: help build run test clean docker-build docker-run migrate-up migrate-down migrate-create

# Default target
help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Build commands
build: ## Build the application binary
	@echo "Building HR Portal Backend..."
	@mkdir -p bin
	@go build -ldflags="-w -s" -o bin/hr-portal-backend cmd/server/main.go

build-linux: ## Build for Linux (useful for Docker)
	@echo "Building for Linux..."
	@mkdir -p bin
	@GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o bin/hr-portal-backend-linux cmd/server/main.go

# Development commands
run: ## Run the application in development mode
	@echo "Starting HR Portal Backend..."
	@go run cmd/server/main.go

dev: ## Run with hot reload (requires air)
	@echo "Starting with hot reload..."
	@air

# Testing commands
test: ## Run all tests
	@echo "Running tests..."
	@go test -v ./...

test-coverage: ## Run tests with coverage
	@echo "Running tests with coverage..."
	@go test -v -coverprofile=coverage.out ./...
	@go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

test-integration: ## Run integration tests
	@echo "Running integration tests..."
	@go test -v -tags=integration ./tests/...

# Database commands
migrate-up: ## Run database migrations up
	@echo "Running database migrations..."
	@migrate -path migrations -database "postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=$(DB_SSLMODE)" up

migrate-down: ## Run database migrations down
	@echo "Rolling back database migrations..."
	@migrate -path migrations -database "postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=$(DB_SSLMODE)" down

migrate-create: ## Create a new migration file
	@echo "Creating new migration..."
	@read -p "Enter migration name: " name; \
	migrate create -ext sql -dir migrations $$name

migrate-force: ## Force migration version (use with caution)
	@echo "Forcing migration version..."
	@migrate -path migrations -database "postgres://$(DB_USER):$(DB_PASSWORD)@$(DB_HOST):$(DB_PORT)/$(DB_NAME)?sslmode=$(DB_SSLMODE)" force $(VERSION)

# Docker commands
docker-build: ## Build Docker image
	@echo "Building Docker image..."
	@docker build -t hr-portal-backend:latest .

docker-run: ## Run Docker container
	@echo "Running Docker container..."
	@docker run -p 8080:8080 --env-file .env hr-portal-backend:latest

docker-compose-up: ## Start services with Docker Compose
	@echo "Starting services with Docker Compose..."
	@docker-compose up -d

docker-compose-down: ## Stop services with Docker Compose
	@echo "Stopping services with Docker Compose..."
	@docker-compose down

# Code quality commands
lint: ## Run linter
	@echo "Running linter..."
	@golangci-lint run

fmt: ## Format code
	@echo "Formatting code..."
	@go fmt ./...

vet: ## Run go vet
	@echo "Running go vet..."
	@go vet ./...

# Documentation commands
docs: ## Generate API documentation
	@echo "Generating API documentation..."
	@swag init -g cmd/server/main.go -o docs

docs-serve: ## Serve API documentation
	@echo "Serving API documentation at http://localhost:8080/swagger/index.html"
	@echo "Make sure the server is running first"

# Setup commands
setup: ## Initial setup for development
	@echo "Setting up development environment..."
	@cp env.example .env
	@echo "Please edit .env file with your configuration"
	@go mod tidy
	@echo "Installing development tools..."
	@go install github.com/golang-migrate/migrate/v4/cmd/migrate@latest
	@go install github.com/swaggo/swag/cmd/swag@latest
	@go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
	@go install github.com/cosmtrek/air@latest

# Cleanup commands
clean: ## Clean build artifacts
	@echo "Cleaning build artifacts..."
	@rm -rf bin/
	@rm -f coverage.out coverage.html

clean-docker: ## Clean Docker images and containers
	@echo "Cleaning Docker artifacts..."
	@docker system prune -f
	@docker image rm hr-portal-backend:latest 2>/dev/null || true

# Production commands
deploy-staging: ## Deploy to staging environment
	@echo "Deploying to staging..."
	@$(MAKE) build-linux
	@echo "Binary ready for staging deployment: bin/hr-portal-backend-linux"

deploy-production: ## Deploy to production environment
	@echo "Deploying to production..."
	@$(MAKE) build-linux
	@echo "Binary ready for production deployment: bin/hr-portal-backend-linux"

# Load environment variables
include .env
export

# Pong Game Project Makefile
# Provides convenient commands for building, testing, and running the project

.PHONY: help build test clean dev prod install-deps

# Default target
help:
	@echo "Pong Game Project - Available Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start development environment with Docker Compose"
	@echo "  make install-deps - Install dependencies for all services"
	@echo "  make build        - Build all services"
	@echo ""
	@echo "Testing:"
	@echo "  make test         - Run all tests"
	@echo "  make test-backend - Run backend tests only"
	@echo "  make test-frontend- Run frontend tests only"
	@echo "  make test-e2e     - Run E2E tests"
	@echo ""
	@echo "Production:"
	@echo "  make prod         - Start production environment"
	@echo "  make clean        - Clean up containers and volumes"
	@echo ""
	@echo "Utilities:"
	@echo "  make logs         - Show logs from all services"
	@echo "  make status       - Show status of all services"

# Install dependencies for all services
install-deps:
	@echo "Installing backend dependencies..."
	cd srcs/services/backend && npm install
	@echo "Installing frontend dependencies..."
	cd srcs/services/frontend && npm install
	@echo "Installing tester dependencies..."
	cd srcs/services/tester && npm install
	@echo "All dependencies installed successfully!"

# Build all services
build:
	@echo "Building all services..."
	@cd srcs && \
	if docker compose version > /dev/null 2>&1; then \
		docker compose build; \
	elif command -v docker-compose > /dev/null 2>&1; then \
		docker-compose build; \
	else \
		echo "Error: docker-compose or docker compose not found"; \
		exit 1; \
	fi
	@echo "Build completed!"

# Start development environment (without tester)
dev:
	@echo "Starting development environment..."
	@cd srcs && \
	if docker compose version > /dev/null 2>&1; then \
		docker compose up --build --scale tester=0; \
	elif command -v docker-compose > /dev/null 2>&1; then \
		docker-compose up --build --scale tester=0; \
	else \
		echo "Error: docker-compose or docker compose not found"; \
		exit 1; \
	fi

# Start production environment
prod:
	@echo "Starting production environment..."
	@cd srcs && \
	if docker compose version > /dev/null 2>&1; then \
		docker compose -f docker-compose.yml up --build -d; \
	elif command -v docker-compose > /dev/null 2>&1; then \
		docker-compose -f docker-compose.yml up --build -d; \
	else \
		echo "Error: docker-compose or docker compose not found"; \
		exit 1; \
	fi

# Run all tests
test:
	@echo "Running all tests..."
	cd srcs && ./run-all-tests.sh

# Run backend tests only
test-backend:
	@echo "Running backend tests..."
	cd srcs/services/backend && npm test

# Run frontend tests only
test-frontend:
	@echo "Running frontend tests..."
	cd srcs/services/frontend && npm test

# Run E2E tests
test-e2e:
	@echo "Running E2E tests..."
	cd srcs/services/frontend && npm run test:e2e:run

# Clean up containers and volumes
clean:
	@echo "Cleaning up containers and volumes..."
	@cd srcs && \
	if docker compose version > /dev/null 2>&1; then \
		docker compose down -v --remove-orphans; \
	elif command -v docker-compose > /dev/null 2>&1; then \
		docker-compose down -v --remove-orphans; \
	else \
		echo "Error: docker-compose or docker compose not found"; \
		exit 1; \
	fi
	@echo "Cleanup completed!"

# Show logs from all services
logs:
	@echo "Showing logs from all services..."
	@cd srcs && \
	if docker compose version > /dev/null 2>&1; then \
		docker compose logs -f; \
	elif command -v docker-compose > /dev/null 2>&1; then \
		docker-compose logs -f; \
	else \
		echo "Error: docker-compose or docker compose not found"; \
		exit 1; \
	fi

# Show status of all services
status:
	@echo "Service status:"
	@cd srcs && \
	if docker compose version > /dev/null 2>&1; then \
		docker compose ps; \
	elif command -v docker-compose > /dev/null 2>&1; then \
		docker-compose ps; \
	else \
		echo "Error: docker-compose or docker compose not found"; \
		exit 1; \
	fi

# ⚠️ NOTE: IP address update commands are no longer needed!
# The application now automatically detects IP addresses at runtime.
# Wi-Fi reconnection does not require any configuration changes.

# Update IP address and restart services (DEPRECATED - No longer needed)
update-ip:
	@echo "⚠️  This command is no longer needed!"
	@echo "The application automatically detects IP addresses at runtime."
	@echo "If you still want to update .env file manually, run:"
	@echo "  cd srcs && ./update-ip.sh"

# Restart all services
restart:
	@echo "Restarting services..."
	@cd srcs && \
	if docker compose version > /dev/null 2>&1; then \
		docker compose down && docker compose up -d --build; \
	elif command -v docker-compose > /dev/null 2>&1; then \
		docker-compose down && docker-compose up -d --build; \
	else \
		echo "Error: docker-compose or docker compose not found"; \
		exit 1; \
	fi

# Update IP and restart in one command (DEPRECATED - No longer needed)
update-and-restart:
	@echo "⚠️  This command is no longer needed!"
	@echo "The application automatically detects IP addresses at runtime."
	@echo "Just restart services if needed: make restart"

# Windows PowerShell specific commands
ifdef COMSPEC
test-windows:
	@echo "Running all tests (Windows)..."
	cd srcs && powershell -ExecutionPolicy Bypass -File run-all-tests.ps1

dev-windows:
	@echo "Starting development environment (Windows)..."
	cd srcs && docker-compose up --build
endif

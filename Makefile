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
	cd srcs && docker-compose build
	@echo "Build completed!"

# Start development environment
dev:
	@echo "Starting development environment..."
	cd srcs && docker-compose up --build

# Start production environment
prod:
	@echo "Starting production environment..."
	cd srcs && docker-compose -f docker-compose.yml up --build -d

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
	cd srcs && docker-compose down -v --remove-orphans
	@echo "Cleanup completed!"

# Show logs from all services
logs:
	@echo "Showing logs from all services..."
	cd srcs && docker-compose logs -f

# Show status of all services
status:
	@echo "Service status:"
	cd srcs && docker-compose ps

# Windows PowerShell specific commands
ifdef COMSPEC
test-windows:
	@echo "Running all tests (Windows)..."
	cd srcs && powershell -ExecutionPolicy Bypass -File run-all-tests.ps1

dev-windows:
	@echo "Starting development environment (Windows)..."
	cd srcs && docker-compose up --build
endif

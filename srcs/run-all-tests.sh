#!/bin/bash

# Run All Tests Script for Pong Game Project
# This script runs backend tests, frontend unit tests, and E2E tests

set -e  # Exit on any error

echo "🚀 Starting comprehensive test suite for Pong Game Project"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Run backend tests
run_backend_tests() {
    print_status "Running backend tests..."
    cd services/backend
    
    if npm test; then
        print_success "Backend tests passed"
    else
        print_error "Backend tests failed"
        exit 1
    fi
    
    cd ../..
}

# Run frontend unit tests
run_frontend_unit_tests() {
    print_status "Running frontend unit tests..."
    cd services/frontend
    
    if npm test -- --run; then
        print_success "Frontend unit tests passed"
    else
        print_error "Frontend unit tests failed"
        exit 1
    fi
    
    cd ../..
}

# Start services for E2E tests
start_services() {
    print_status "Starting services with Docker Compose..."
    
    # Start services in background
    docker-compose up --build -d
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        print_success "Services are running"
    else
        print_error "Services failed to start"
        docker-compose logs
        exit 1
    fi
}

# Run E2E tests
run_e2e_tests() {
    print_status "Running E2E tests..."
    cd services/frontend
    
    if npx cypress run; then
        print_success "E2E tests passed"
    else
        print_error "E2E tests failed"
        exit 1
    fi
    
    cd ../..
}

# Stop services
stop_services() {
    print_status "Stopping services..."
    docker-compose down
    print_success "Services stopped"
}

# Main execution
main() {
    echo "📋 Test Plan:"
    echo "1. Backend unit tests"
    echo "2. Frontend unit tests"
    echo "3. Start services with Docker Compose"
    echo "4. E2E tests with Cypress"
    echo "5. Clean up services"
    echo ""
    
    # Check prerequisites
    check_docker
    
    # Run unit tests first
    run_backend_tests
    run_frontend_unit_tests
    
    # Start services for E2E tests
    start_services
    
    # Run E2E tests
    run_e2e_tests
    
    # Clean up
    stop_services
    
    echo ""
    echo "🎉 All tests completed successfully!"
    echo "=================================================="
}

# Handle script interruption
trap 'print_error "Test execution interrupted"; stop_services; exit 1' INT TERM

# Run main function
main "$@" 
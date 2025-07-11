# Run All Tests Script for Pong Game Project (Windows PowerShell)
# This script runs backend tests, frontend unit tests, and E2E tests

param(
    [switch]$SkipE2E,
    [switch]$Headless
)

# Set error action preference
$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting comprehensive test suite for Pong Game Project" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if Docker is running
function Test-Docker {
    try {
        docker info | Out-Null
        Write-Success "Docker is running"
        return $true
    }
    catch {
        Write-Error "Docker is not running. Please start Docker and try again."
        return $false
    }
}

# Run backend tests
function Invoke-BackendTests {
    Write-Status "Running backend tests..."
    Push-Location "services/backend"
    
    try {
        npm test
        Write-Success "Backend tests passed"
    }
    catch {
        Write-Error "Backend tests failed"
        Pop-Location
        exit 1
    }
    finally {
        Pop-Location
    }
}

# Run frontend unit tests
function Invoke-FrontendUnitTests {
    Write-Status "Running frontend unit tests..."
    Push-Location "services/frontend"
    
    try {
        if ($Headless) {
            npm test -- --run
        } else {
            npm test
        }
        Write-Success "Frontend unit tests passed"
    }
    catch {
        Write-Error "Frontend unit tests failed"
        Pop-Location
        exit 1
    }
    finally {
        Pop-Location
    }
}

# Start services for E2E tests
function Start-Services {
    Write-Status "Starting services with Docker Compose..."
    
    try {
        # Start services in background
        docker-compose up --build -d
        
        # Wait for services to be ready
        Write-Status "Waiting for services to be ready..."
        Start-Sleep -Seconds 30
        
        # Check if services are running
        $services = docker-compose ps
        if ($services -match "Up") {
            Write-Success "Services are running"
        } else {
            Write-Error "Services failed to start"
            docker-compose logs
            exit 1
        }
    }
    catch {
        Write-Error "Failed to start services"
        exit 1
    }
}

# Run E2E tests
function Invoke-E2ETests {
    Write-Status "Running E2E tests..."
    Push-Location "services/frontend"
    
    try {
        npx cypress run
        Write-Success "E2E tests passed"
    }
    catch {
        Write-Error "E2E tests failed"
        Pop-Location
        exit 1
    }
    finally {
        Pop-Location
    }
}

# Stop services
function Stop-Services {
    Write-Status "Stopping services..."
    try {
        docker-compose down
        Write-Success "Services stopped"
    }
    catch {
        Write-Warning "Failed to stop services gracefully"
    }
}

# Main execution
function Main {
    Write-Host "📋 Test Plan:" -ForegroundColor Cyan
    Write-Host "1. Backend unit tests"
    Write-Host "2. Frontend unit tests"
    
    if (-not $SkipE2E) {
        Write-Host "3. Start services with Docker Compose"
        Write-Host "4. E2E tests with Cypress"
        Write-Host "5. Clean up services"
    }
    
    Write-Host ""
    
    # Check prerequisites
    if (-not (Test-Docker)) {
        exit 1
    }
    
    # Run unit tests first
    Invoke-BackendTests
    Invoke-FrontendUnitTests
    
    # Run E2E tests if not skipped
    if (-not $SkipE2E) {
        Start-Services
        Invoke-E2ETests
        Stop-Services
    }
    
    Write-Host ""
    Write-Host "🎉 All tests completed successfully!" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Cyan
}

# Handle script interruption
try {
    # Run main function
    Main
}
catch {
    Write-Error "Test execution interrupted"
    Stop-Services
    exit 1
} 
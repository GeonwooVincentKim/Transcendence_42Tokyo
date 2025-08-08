# 🏓 Pong Game Project - Comprehensive Usage Guide

This folder serves as a **framework demonstrating the complete usage and integration methods** for the Pong Game Project.

> **🌐 Multilingual Versions**: [한국어](README.md) | [日本語](README_JP.md)

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Service-specific Usage](#service-specific-usage)
3. [Integration Usage](#integration-usage)
4. [Testing Framework](#testing-framework)
5. [Troubleshooting](#troubleshooting)

## 🎯 Project Overview

### Project Structure
```
srcs/
├── docker-compose.yml          # Complete service integration
├── run-all-tests.ps1          # Windows test script
├── run-all-tests.sh           # Linux/Mac test script
└── services/
    ├── backend/               # Fastify + WebSocket server
    ├── frontend/              # React + Vite client
    └── tester/                # This folder - usage guide
```

### Technology Stack
- **Backend**: Fastify, TypeScript, WebSocket, PostgreSQL
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **DevOps**: Docker, Docker Compose, Nginx
- **Testing**: Jest, Vitest, Cypress

## 🚀 Service-specific Usage

### 1. Backend Service

#### Development Mode
```bash
cd srcs/services/backend
npm install
npm run dev
```

#### Test Execution
```bash
npm test                    # Unit tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage
```

#### Docker Execution
```bash
cd srcs
docker-compose up backend
```

#### Key Scripts
- `npm run dev`: Development server (port 8000)
- `npm run build`: TypeScript compilation
- `npm start`: Production server execution

### 2. Frontend Service

#### Development Mode
```bash
cd srcs/services/frontend
npm install
npm run dev
```

#### Test Execution
```bash
npm test                    # Vitest unit tests
npm run test:ui            # UI test runner
npm run test:coverage      # With coverage
npm run test:e2e           # Cypress E2E tests
```

#### Build and Deploy
```bash
npm run build              # Production build
npm run preview            # Build result preview
```

#### Docker Execution
```bash
cd srcs
docker-compose up frontend
```

### 3. Docker Integration

#### Complete Service Execution
```bash
cd srcs
docker-compose up --build
```

#### Individual Service Execution
```bash
docker-compose up backend    # Backend only
docker-compose up frontend   # Frontend only
docker-compose up postgres   # Database only
```

#### Service Status Check
```bash
docker-compose ps           # Running services
docker-compose logs         # Log verification
docker-compose down         # Service stop
```

## 🔧 Integration Usage

### 1. Complete Project Startup

#### Method 1: Docker Compose (Recommended)
```bash
cd srcs
docker-compose up --build
```

#### Method 2: Individual Development
```bash
# Terminal 1: Backend
cd srcs/services/backend
npm run dev

# Terminal 2: Frontend
cd srcs/services/frontend
npm run dev

# Terminal 3: Database (Optional)
docker run -d --name postgres \
  -e POSTGRES_DB=pong_db \
  -e POSTGRES_USER=pong_user \
  -e POSTGRES_PASSWORD=pong_password \
  -p 5432:5432 \
  postgres:15-alpine
```

### 2. Environment Configuration

#### Backend Environment Variables
```bash
# Create .env file
NODE_ENV=development
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://pong_user:pong_password@localhost:5432/pong_db
```

#### Frontend Environment Variables
```bash
# Create .env file
VITE_API_URL=http://localhost:8000
```

### 3. Port Configuration
- **Frontend**: http://localhost:3000 (development) / http://localhost:80 (Docker)
- **Backend**: http://localhost:8000
- **Database**: localhost:5432

## 🧪 Testing Framework

### 1. Unit Tests

#### Backend Tests
```bash
cd srcs/services/backend
npm test
```

#### Frontend Tests
```bash
cd srcs/services/frontend
npm test
```

### 2. Integration Tests

#### Complete Test Execution (Windows)
```bash
cd srcs
.\run-all-tests.ps1
```

#### Complete Test Execution (Linux/Mac)
```bash
cd srcs
./run-all-tests.sh
```

#### E2E Tests
```bash
cd srcs/services/frontend
npm run test:e2e:run
```

### 3. Coverage Verification
```bash
# Backend
cd srcs/services/backend
npm run test:coverage

# Frontend
cd srcs/services/frontend
npm run test:coverage
```

## 🔍 Troubleshooting

### 1. Port Conflicts
```bash
# Port usage verification
netstat -ano | findstr :8000
netstat -ano | findstr :3000

# Docker container cleanup
docker-compose down
docker system prune
```

### 2. Dependency Issues
```bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### 3. Docker Issues
```bash
# Docker cache cleanup
docker system prune -a
docker-compose build --no-cache
```

### 4. Database Issues
```bash
# PostgreSQL container restart
docker-compose restart postgres

# Database initialization
docker-compose down -v
docker-compose up postgres
```

## 📊 Monitoring

### 1. Log Verification
```bash
# Complete logs
docker-compose logs

# Specific service logs
docker-compose logs backend
docker-compose logs frontend
```

### 2. Status Check
```bash
# Service status
docker-compose ps

# Resource usage
docker stats
```

## 🚀 Deployment

### 1. Production Build
```bash
# Frontend build
cd srcs/services/frontend
npm run build

# Backend build
cd srcs/services/backend
npm run build
```

### 2. Docker Deployment
```bash
cd srcs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 📝 Development Guidelines

### 1. Code Style
- Use TypeScript for type safety
- Follow ESLint configuration
- Write comprehensive tests
- Add JSDoc comments for functions

### 2. Git Workflow
1. Create feature branch
2. Implement changes
3. Run tests
4. Verify linting
5. Submit pull request

### 3. Testing Strategy
- Unit tests: Functions/components
- Integration tests: API endpoints
- E2E tests: User scenarios

---

## 🎮 Game Play

### Controls
- **Left Paddle**: `W` (up) / `S` (down)
- **Right Paddle**: `↑` (up) / `↓` (down)

### Objective
Prevent the ball from passing your paddle while trying to score against your opponent!

---

**Happy Gaming! 🏓**

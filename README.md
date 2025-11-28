# Pong Game Project - Common Framework

A comprehensive multiplayer Pong game built with modern web technologies, designed for easy onboarding of new team members.

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ 
- **Docker** and Docker Compose
- **Git**

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd Trascendence

# Install dependencies for all services
cd srcs/services/backend && npm install
cd ../frontend && npm install
cd ../tester && npm install
cd ../..

# Set up environment variables
cd srcs
cp .env.example .env
# Edit .env and set JWT_SECRET to a strong random value
# For production, generate a secure secret:
# openssl rand -base64 32
```

### Development
```bash
# Start all services with Docker Compose
cd srcs
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# Database: localhost:5432
```

**⚠️ Important Security Note:**
- The `.env` file contains sensitive credentials and is automatically ignored by git
- Never commit `.env` to version control
- Always use `.env.example` as a template for required environment variables
- In production, use a strong, randomly generated `JWT_SECRET` (minimum 32 characters)

### Testing
```bash
# Run all tests (Windows PowerShell)
.\run-all-tests.ps1

# Run all tests (Linux/macOS)
./run-all-tests.sh

# Run specific service tests
cd srcs/services/backend && npm test
cd ../frontend && npm test
cd ../tester && npm test
```

## 📁 Project Structure

```
Trascendence/
├── srcs/
│   ├── services/
│   │   ├── backend/          # Node.js + Express API
│   │   ├── frontend/         # React + TypeScript + Vite
│   │   ├── docker/           # Docker configurations
│   │   └── tester/           # Comprehensive testing framework
│   ├── docker-compose.yml    # Multi-service orchestration
│   ├── run-all-tests.sh     # Linux/macOS test runner
│   └── run-all-tests.ps1    # Windows test runner
├── README_EN.md             # English documentation
├── README_JP.md             # Japanese documentation
└── TESTING.md               # Detailed testing guide
```

## 🏗️ Common Framework Architecture

### Services Overview

#### 1. Backend Service (`srcs/services/backend/`)
- **Technology**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **Features**: 
  - RESTful API endpoints
  - JWT authentication
  - Game state management
  - User management
  - Real-time communication

#### 2. Frontend Service (`srcs/services/frontend/`)
- **Technology**: React 19 + TypeScript + Vite
- **Styling**: TailwindCSS
- **Features**:
  - Responsive game interface
  - Real-time game rendering
  - User authentication UI
  - Game controls and settings

#### 3. Docker Service (`srcs/services/docker/`)
- **Technology**: Docker + Docker Compose
- **Features**:
  - Multi-service orchestration
  - Development and production environments
  - Database initialization
  - Network configuration

#### 4. Tester Service (`srcs/services/tester/`)
- **Technology**: Jest + Cypress + TypeScript
- **Features**:
  - Unit testing framework
  - E2E testing with Cypress
  - API testing utilities
  - Performance testing
  - Test data generation

## 🎮 Game Features

### Core Gameplay
- **Classic Pong mechanics** with modern enhancements
- **Real-time multiplayer** support
- **AI opponent** for single-player mode
- **Tournament system** with multiple bracket types
- **Score tracking** and statistics
- **Game state persistence**

### User Experience
- **Responsive design** for all devices
- **Smooth animations** and visual feedback
- **Customizable game settings**
- **Leaderboard** and rankings
- **User profiles** and statistics
- **Tournament management** interface

### Tournament System
- **Multiple Tournament Types**:
  - Single Elimination (most common)
  - Double Elimination (coming soon)
  - Round Robin (coming soon)
- **Guest User Support**: Players can join tournaments without registration using unique aliases
- **Interactive Bracket Visualization**: Zoom, pan, and navigate tournament brackets
- **Real-time Updates**: Live match results and tournament progress
- **Tournament Management**:
  - Create tournaments with custom settings
  - Join/leave tournaments
  - Start tournaments when ready
  - Cancel tournaments if needed
- **Match Integration**: Seamless integration with the game system
- **Statistics Tracking**: Comprehensive tournament and player statistics

### Technical Features
- **WebSocket** real-time communication
- **JWT-based authentication**
- **Database persistence**
- **Tournament bracket generation**
- **Guest user support** for tournaments
- **Multiple tournament types** (Single Elimination, Double Elimination, Round Robin)
- **Interactive bracket visualization**
- **Real-time match updates**
- **Error handling** and logging
- **Performance optimization**

## 🛠️ Development Guidelines

### Code Standards

#### TypeScript
- **Strict mode** enabled
- **ESLint** for code quality
- **Prettier** for formatting
- **Type safety** throughout

#### Testing
- **Jest** for unit tests
- **Cypress** for E2E tests
- **Test coverage** requirements
- **Table-driven tests** pattern

#### Documentation
- **JSDoc** comments for functions
- **README** files for each service
- **API documentation** with examples
- **Code examples** and tutorials

### Adding New Features

#### Backend Development
```bash
cd srcs/services/backend
npm run dev          # Start development server
npm test             # Run tests
npm run build        # Build for production
```

#### Frontend Development
```bash
cd srcs/services/frontend
npm run dev          # Start development server
npm test             # Run tests
npm run build        # Build for production
```

#### Testing
```bash
cd srcs/services/tester
npm test             # Run all tests
npm run test:e2e     # Run E2E tests
npm run test:coverage # Run with coverage
```

## 🧪 Testing Strategy

### Test Categories

1. **Unit Tests**
   - Individual function testing
   - Component testing
   - Business logic validation

2. **Integration Tests**
   - API endpoint testing
   - Service interaction testing
   - Database integration testing

3. **E2E Tests**
   - Complete user workflows
   - Cross-browser compatibility
   - Responsive design testing

4. **Performance Tests**
   - Response time testing
   - Load testing
   - Memory usage monitoring

### Running Tests

#### All Tests
```bash
# Windows
.\run-all-tests.ps1

# Linux/macOS
./run-all-tests.sh
```

#### Specific Test Types
```bash
# Backend tests only
cd srcs/services/backend && npm test

# Frontend tests only
cd srcs/services/frontend && npm test

# E2E tests only
cd srcs/services/frontend && npx cypress run
```

## 🚀 Deployment

### Production Build
```bash
# Build all services
cd srcs/services/backend && npm run build
cd ../frontend && npm run build

# Start production services
cd ../..
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables
```env
# Backend
NODE_ENV=production
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://user:pass@host:port/db

# Frontend
VITE_API_URL=http://localhost:8000
VITE_APP_TITLE=Pong Game
```

## 🤝 Contributing

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch
3. **Develop** with tests
4. **Run** all tests locally
5. **Submit** a pull request

### Code Review Checklist

- [ ] **Tests pass** locally
- [ ] **Code follows** style guidelines
- [ ] **Documentation** is updated
- [ ] **No console errors** or warnings
- [ ] **Performance** is acceptable

### Commit Guidelines

```
feat: add new game mode
fix: resolve authentication issue
docs: update API documentation
test: add unit tests for user service
refactor: improve game state management
```

## 📚 Documentation

### Service Documentation
- [Backend Service](./srcs/services/backend/README.md)
- [Frontend Service](./srcs/services/frontend/README.md)
- [Tester Service](./srcs/services/tester/README.md)
- [Testing Guide](./TESTING.md)

### Language-Specific Documentation
- [English Documentation](./README_EN.md)
- [Japanese Documentation](./README_JP.md)

### API Documentation
- **Base URL**: `http://localhost:8000`
- **Authentication**: JWT Bearer tokens
- **Content-Type**: `application/json`

### Common Endpoints
```
GET    /health              # Health check
GET    /api/game/state      # Get game state
POST   /api/auth/register   # User registration
POST   /api/auth/login      # User login
GET    /api/users/profile   # Get user profile

# Tournament API
GET    /api/tournaments                    # List tournaments
POST   /api/tournaments                    # Create tournament
GET    /api/tournaments/:id                # Get tournament details
POST   /api/tournaments/:id/join           # Join tournament
POST   /api/tournaments/:id/leave          # Leave tournament
POST   /api/tournaments/:id/start          # Start tournament
POST   /api/tournaments/:id/cancel         # Cancel tournament
GET    /api/tournaments/:id/participants   # Get tournament participants
GET    /api/tournaments/:id/matches        # Get tournament matches
GET    /api/tournaments/:id/bracket        # Get tournament bracket
POST   /api/tournaments/:id/matches/:matchId/result # Submit match result
GET    /api/tournaments/stats              # Get tournament statistics
```

## 🐛 Troubleshooting

### Common Issues

#### Docker Issues
```bash
# Check Docker status
docker info

# Restart Docker services
docker-compose down
docker-compose up --build
```

#### Port Conflicts
```bash
# Check port usage
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # Linux/macOS
```

#### Database Issues
```bash
# Reset database
docker-compose down -v
docker-compose up --build
```

#### Test Failures
```bash
# Clear test cache
npm test -- --clearCache

# Run with verbose output
npm test -- --verbose
```

### Getting Help

1. **Check logs**: `docker-compose logs`
2. **Verify services**: `docker-compose ps`
3. **Run tests**: Use test scripts
4. **Check documentation**: Service README files

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Backend Developer**: API and database development
- **Frontend Developer**: UI/UX and game interface
- **DevOps Engineer**: Docker and deployment
- **QA Engineer**: Testing and quality assurance

## 🔗 Links

- **Repository**: [GitHub Repository]
- **Documentation**: [Project Wiki]
- **Issues**: [GitHub Issues]
- **Discussions**: [GitHub Discussions]

---

**Happy Coding! 🎮**
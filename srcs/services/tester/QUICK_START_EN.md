# 🚀 Pong Game Project - Quick Start Guide

This guide helps team members quickly start the project.

> **🌐 Multilingual Versions**: [한국어](QUICK_START.md) | [日本語](QUICK_START_JP.md)

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Docker (optional)
- Git

## ⚡ 5-Minute Quick Start

### 1. Clone the Project
```bash
git clone <repository-url>
cd Trascendence/srcs
```

### 2. Start All Services (Docker)
```bash
docker-compose up --build
```

### 3. Access Verification
- **Game**: http://localhost:3000
- **API**: http://localhost:8000
- **Health Check**: http://localhost:8000/

## 🔧 Development Mode

### Backend Development
```bash
cd services/backend
npm install
npm run dev
```

### Frontend Development
```bash
cd services/frontend
npm install
npm run dev
```

## 🧪 Test Execution

### Complete Tests (Windows)
```bash
.\run-all-tests.ps1
```

### Complete Tests (Linux/Mac)
```bash
./run-all-tests.sh
```

### Individual Tests
```bash
# Backend tests
cd services/backend && npm test

# Frontend tests
cd services/frontend && npm test

# Integration tests
cd services/tester && npm test
```

## 📚 Usage Examples

### Linux/Mac
```bash
cd services/tester
npm run examples:linux
```

### Windows
```bash
cd services/tester
npm run examples:windows
```

### Without Docker
```bash
npm run examples:docker
```

## 🎮 Game Play

### Controls
- **Left Paddle**: `W` (up) / `S` (down)
- **Right Paddle**: `↑` (up) / `↓` (down)

### Objective
Prevent the ball from passing your paddle while trying to score against your opponent!

## 🔍 Troubleshooting

### Port Conflicts
```bash
# Port usage check
netstat -ano | findstr :8000
netstat -ano | findstr :3000

# Docker cleanup
docker-compose down
docker system prune
```

### Dependency Issues
```bash
# Reinstall node_modules
rm -rf node_modules package-lock.json
npm install
```

### Docker Issues
```bash
# Rebuild without cache
docker-compose build --no-cache
```

## 📖 Detailed Documentation

- [Complete Usage Guide](README_EN.md)
- [API Documentation](API.md)
- [Testing Guide](TESTING.md)

## 🆘 Help

If you encounter issues:
1. Check this guide again
2. Refer to [Complete Usage Guide](README_EN.md)
3. Ask team members

---

**Happy Gaming! 🏓**

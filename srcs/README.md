# 🏓 Pong Game Project

A classic Pong game implementation with modern web technologies, featuring real-time multiplayer capabilities and a responsive design.

## 🚀 Features

- **Classic Pong Gameplay**: Authentic paddle and ball physics
- **Real-time Multiplayer**: WebSocket support for live game sessions
- **Responsive Design**: Works on desktop and mobile devices
- **Modern Tech Stack**: React, TypeScript, Fastify, and Docker
- **Comprehensive Testing**: Unit tests for both frontend and backend
- **Docker Support**: Easy deployment with Docker Compose

## 🏗️ Project Structure

```
srcs/
├── docker-compose.yml          # Docker Compose configuration
├── README.md                   # This file
└── services/
    ├── backend/                # Backend service (Fastify + WebSocket)
    │   ├── src/
    │   │   ├── index.ts       # Main server file
    │   │   └── tests/         # Backend tests
    │   ├── Dockerfile         # Backend Docker configuration
    │   ├── package.json       # Backend dependencies
    │   └── tsconfig.json      # TypeScript configuration
    └── frontend/              # Frontend service (React + Vite)
        ├── src/
        │   ├── components/
        │   │   └── PongGame.tsx  # Main game component
        │   ├── App.tsx        # Main app component
        │   └── main.tsx       # App entry point
        ├── Dockerfile         # Frontend Docker configuration
        ├── nginx.conf         # Nginx configuration
        └── package.json       # Frontend dependencies
```

## 🎮 Game Controls

- **Left Paddle**: `W` (up) / `S` (down)
- **Right Paddle**: `↑` (up) / `↓` (down)
- **Objective**: Prevent the ball from passing your paddle while trying to score against your opponent

## 🛠️ Technology Stack

### Backend
- **Fastify**: High-performance web framework
- **TypeScript**: Type-safe JavaScript
- **WebSocket**: Real-time communication
- **CORS**: Cross-origin resource sharing
- **Jest**: Testing framework

### Frontend
- **React 18**: Modern UI library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool
- **HTML5 Canvas**: Game rendering
- **Tailwind CSS**: Utility-first CSS framework
- **Vitest**: Testing framework

### DevOps
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **Nginx**: Reverse proxy and static file serving

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- npm or yarn

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Trascendence/srcs
   ```

2. **Start all services**
   ```bash
   docker compose up --build
   ```

3. **Access the application**
   - Frontend: http://localhost:3000 (or port 80)
   - Backend API: http://localhost:8000
   - Health Check: http://localhost:8000/

### Local Development

#### Backend Development
```bash
cd services/backend
npm install
npm run dev
```

#### Frontend Development
```bash
cd services/frontend
npm install
npm run dev
```

## 🧪 Testing

### Backend Tests
```bash
cd services/backend
npm install
npm test
```

### Frontend Tests
```bash
cd services/frontend
npm install
npm test
```

## 📡 API Endpoints

### REST API
- `GET /` - Health check
- `GET /api/ping` - Connectivity test
- `GET /api/game/state` - Current game state

### WebSocket
- `WS /ws` - Real-time game communication

## 🔧 Configuration

### Environment Variables

#### Backend
- `PORT`: Server port (default: 8000)
- `HOST`: Server host (default: 0.0.0.0)
- `NODE_ENV`: Environment (development/production)

#### Frontend
- `VITE_API_URL`: Backend API URL (default: http://localhost:8000)

### Docker Configuration
- Backend port: 8000
- Frontend port: 80 (nginx)
- Nginx configuration: `services/frontend/nginx.conf`

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**
   - Ensure ports 8000 and 80 are available
   - Check for other running services

2. **Docker build failures**
   - Clear Docker cache: `docker system prune`
   - Rebuild without cache: `docker compose build --no-cache`

3. **WebSocket connection issues**
   - Verify backend is running on port 8000
   - Check browser console for connection errors

4. **Game not responding**
   - Ensure keyboard focus is on the game canvas
   - Check browser console for JavaScript errors

### Debug Mode

#### Backend Debug
```bash
cd services/backend
npm run dev
```

#### Frontend Debug
```bash
cd services/frontend
npm run dev
```

## 📝 Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow ESLint configuration
- Write comprehensive tests
- Add JSDoc comments for functions

### Git Workflow
1. Create feature branch
2. Make changes with tests
3. Run linting and tests
4. Submit pull request

### Testing Strategy
- Unit tests for components and functions
- Integration tests for API endpoints
- E2E tests for critical user flows

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- Classic Pong game inspiration
- Modern web development community
- Open source contributors

---

**Happy Gaming! 🏓** 
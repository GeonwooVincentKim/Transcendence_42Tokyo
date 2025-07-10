# Pong Game - Transcendence Project

A real-time multiplayer Pong game built with React, TypeScript, and Fastify.

## Prerequisites

- Node.js 18+ 
- Docker (optional, for containerized deployment)
- Git

## Quick Start

### Option 1: Docker (Recommended)
```bash
git clone <your-repo-url>
cd TRASCENDENCE
docker-compose up --build
```

### Option 2: Local Development
```bash
git clone <your-repo-url>
cd TRASCENDENCE

# Frontend
cd srcs/services/frontend
npm install
npm run dev

# Backend (in another terminal)
cd srcs/services/backend
npm install
npm run dev
```

## Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## Project Structure

- `srcs/services/frontend/` - React + TypeScript + TailwindCSS
- `srcs/services/backend/` - Fastify + TypeScript
- `srcs/services/docker/` - Docker configurations

## Available Scripts

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Backend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
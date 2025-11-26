# 🎯 Svelte Migration Guide

## 📋 Overview

This directory contains both the **React** and **Svelte** versions of the frontend application running in parallel during the migration phase.

## 🗂️ Directory Structure

```
frontend/
├── src/                    # Original React code (PORT 3000)
├── src-svelte/             # New Svelte code (PORT 3001)
│   ├── components/         # Svelte components
│   ├── lib/                # Svelte-specific logic
│   └── shared/             # Shared code between React & Svelte
│       ├── services/       # API services (auth, socket, stats, tournament)
│       ├── types/          # TypeScript types
│       └── locales/        # i18n translation files
├── vite.config.ts          # React Vite config
├── vite.config.svelte.ts   # Svelte Vite config
├── index.html              # React entry point
└── index-svelte.html       # Svelte entry point
```

## 🚀 Running Both Versions

### React Version (Original)
```bash
npm run dev          # Runs on http://localhost:3000
npm run build        # Builds to dist/
```

### Svelte Version (New)
```bash
npm run dev:svelte   # Runs on http://localhost:3001
npm run build:svelte # Builds to dist-svelte/
```

## 📦 Installation

```bash
# Install all dependencies (React + Svelte)
npm install
```

## 🎯 Migration Status

### ✅ Completed
- [x] Svelte project structure
- [x] Shared services layer (authService, socketIOService, etc.)
- [x] TypeScript configuration
- [x] Vite build configuration
- [x] Basic Svelte App component

### 🚧 In Progress
- [ ] LoginForm component
- [ ] RegisterForm component
- [ ] Game components (PongGame, AIPong, MultiPlayerPong)
- [ ] Tournament components
- [ ] User profile components

### ⏳ Pending
- [ ] Full i18n integration
- [ ] All components migrated
- [ ] E2E tests for Svelte version
- [ ] Docker configuration update

## 🔧 Key Differences: React vs Svelte

### State Management
**React:**
```typescript
const [count, setCount] = useState(0);
```

**Svelte:**
```typescript
let count = 0; // Automatically reactive!
```

### Effects
**React:**
```typescript
useEffect(() => {
  // side effects
}, [deps]);
```

**Svelte:**
```typescript
$: {
  // Reactive statement - runs when dependencies change
}
```

### Lifecycle
**React:**
```typescript
useEffect(() => {
  // on mount
  return () => {
    // on unmount
  };
}, []);
```

**Svelte:**
```typescript
import { onMount, onDestroy } from 'svelte';

onMount(() => {
  // on mount
});

onDestroy(() => {
  // on unmount
});
```

## 🧪 Testing

### React Tests
```bash
npm test
```

### Svelte Tests
```bash
# To be configured
```

## 📝 Notes

1. **Port Separation**: React (3000) and Svelte (3001) run on different ports
2. **Shared Services**: Both versions use the same backend services
3. **Gradual Migration**: Components are migrated one by one
4. **Rollback Safe**: Original React code is preserved

## 🎓 Learning Resources

- [Svelte Tutorial](https://svelte.dev/tutorial)
- [Svelte Examples](https://svelte.dev/examples)
- [SvelteKit Docs](https://kit.svelte.dev/docs)

## ⚠️ Important

This is a migration branch. The React version remains fully functional until all features are successfully migrated to Svelte.


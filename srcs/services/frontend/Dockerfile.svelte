# Svelte-specific Dockerfile (much faster build)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (much faster than React build)
RUN npm install

# Copy Svelte source code and public assets
COPY src-svelte ./src-svelte
COPY public ./public
COPY vite.config.svelte.ts ./
COPY svelte.config.js ./
COPY tsconfig.svelte.json ./
COPY index-svelte.html ./

# Build Svelte application
RUN npm run build:svelte

# Production stage
FROM nginx:1.25-alpine AS production

# Copy built Svelte application
COPY --from=builder /app/dist-svelte /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]


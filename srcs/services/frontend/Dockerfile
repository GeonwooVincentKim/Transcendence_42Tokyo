# Multi-stage build for Svelte frontend
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Clear npm cache and install dependencies with proper platform detection
RUN npm cache clean --force && \
    rm -rf node_modules && \
    npm install && \
    npm rebuild esbuild && \
    npx esbuild --version

# Copy source code
COPY . .

# Build the Svelte application
RUN npm run build:svelte

# Production stage
FROM nginx:1.25-alpine AS production

# Copy built Svelte application from builder stage
COPY --from=builder /app/dist-svelte /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 
 
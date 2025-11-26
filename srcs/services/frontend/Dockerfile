# Multi-stage build for Svelte frontend
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# No build args needed - API URL is determined at runtime from window.location
# This allows the app to work on any IP address without rebuilding

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
RUN npm run build

# CSP is now configured in index-svelte.html to allow dynamic IP addresses
# No need to modify it during build

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
 
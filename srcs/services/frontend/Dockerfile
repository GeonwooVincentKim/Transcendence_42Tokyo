# Multi-stage build for React frontend
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

# Build the application
RUN npm run build

# Fix CSP in the built HTML file
RUN sed -i 's/connect-src '\''self'\'' ws:\/\/localhost:8000;/connect-src '\''self'\'' ws:\/\/localhost:8000 http:\/\/localhost:8000;/g' /app/dist/index.html

# Production stage
FROM nginx:1.25-alpine AS production

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 

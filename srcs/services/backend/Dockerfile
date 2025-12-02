FROM node:20-slim AS builder

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies and rebuild native modules
# Use npm install instead of npm ci for better caching in development
RUN npm install --include=dev && \
    npm rebuild better-sqlite3

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-slim AS production

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --production && \
    npm rebuild better-sqlite3

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create data directory for SQLite database with proper permissions
RUN mkdir -p /app/data && \
    chown -R node:node /app && \
    chmod -R 755 /app/data

# Switch to non-root user
USER node

EXPOSE 8000

CMD ["node", "--trace-warnings", "dist/index.js"]
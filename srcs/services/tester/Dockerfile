# Tester Service Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port for web interface
EXPOSE 8080

# Create a simple web server for test results
RUN npm install -g http-server

# Create test results directory
RUN mkdir -p /app/test-results

# Copy web interface files
COPY web-interface/ /app/web-interface/

# Start command
CMD ["npm", "start"]

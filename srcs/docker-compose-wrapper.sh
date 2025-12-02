#!/bin/bash
# Docker Compose wrapper script that detects the correct command
# Works on both Linux and Mac

set -e

# Check buildx version and disable if too old
BUILDX_VERSION=""
if docker buildx version > /dev/null 2>&1; then
    BUILDX_VERSION=$(docker buildx version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' | head -1 || echo "0.0")
    BUILDX_MAJOR=$(echo "$BUILDX_VERSION" | cut -d. -f1)
    BUILDX_MINOR=$(echo "$BUILDX_VERSION" | cut -d. -f2)
    
    if [ "$BUILDX_MAJOR" -eq 0 ] && [ "$BUILDX_MINOR" -lt 17 ]; then
        echo "Warning: buildx version $BUILDX_VERSION is less than 0.17."
        echo "Disabling buildx and using standard Docker build instead."
        # Disable buildx by unsetting DOCKER_BUILDKIT and COMPOSE_DOCKER_CLI_BUILD
        export DOCKER_BUILDKIT=0
        export COMPOSE_DOCKER_CLI_BUILD=0
    else
        # Enable buildx for newer versions
        export DOCKER_BUILDKIT=1
        export COMPOSE_DOCKER_CLI_BUILD=1
        # Initialize buildx if needed
        BUILDX_OUTPUT=$(docker buildx ls 2>/dev/null || echo "")
        if [ -z "$BUILDX_OUTPUT" ] || ! echo "$BUILDX_OUTPUT" | grep -qE "(default|desktop-linux|builder)"; then
            echo "Initializing Docker buildx..."
            docker buildx create --name builder --use 2>/dev/null || true
            docker buildx inspect --bootstrap 2>/dev/null || true
        fi
    fi
else
    # No buildx available, use standard Docker build
    export DOCKER_BUILDKIT=0
    export COMPOSE_DOCKER_CLI_BUILD=0
fi

# Enable BuildKit for faster builds (if buildx version is sufficient)
if [ -z "$DOCKER_BUILDKIT" ] || [ "$DOCKER_BUILDKIT" != "0" ]; then
    export DOCKER_BUILDKIT=1
    export COMPOSE_DOCKER_CLI_BUILD=1
fi

# Try docker compose (v2) first, then docker-compose (v1)
if docker compose version > /dev/null 2>&1; then
    docker compose "$@"
elif command -v docker-compose > /dev/null 2>&1; then
    docker-compose "$@"
else
    echo "Error: docker-compose or docker compose not found" >&2
    exit 1
fi


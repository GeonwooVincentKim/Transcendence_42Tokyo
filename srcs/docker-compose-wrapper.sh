#!/bin/bash
# Docker Compose wrapper script that detects the correct command
# Works on both Linux and Mac

set -e

# Check if buildx is available and properly initialized
if docker buildx version > /dev/null 2>&1; then
    # Check if buildx has any builders
    BUILDX_OUTPUT=$(docker buildx ls 2>/dev/null || echo "")
    if [ -z "$BUILDX_OUTPUT" ] || ! echo "$BUILDX_OUTPUT" | grep -qE "(default|desktop-linux|builder)"; then
        echo "Initializing Docker buildx..."
        docker buildx create --name builder --use 2>/dev/null || true
        docker buildx inspect --bootstrap 2>/dev/null || true
    fi
    # Check buildx version
    BUILDX_VERSION=$(docker buildx version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' | head -1 || echo "0.0")
    BUILDX_MAJOR=$(echo "$BUILDX_VERSION" | cut -d. -f1)
    BUILDX_MINOR=$(echo "$BUILDX_VERSION" | cut -d. -f2)
    if [ "$BUILDX_MAJOR" -eq 0 ] && [ "$BUILDX_MINOR" -lt 17 ]; then
        echo "Warning: buildx version $BUILDX_VERSION is less than 0.17. Some features may not work."
        echo "Consider upgrading Docker or buildx plugin."
    fi
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


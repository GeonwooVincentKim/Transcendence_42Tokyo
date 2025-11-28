#!/bin/bash
# Docker Compose wrapper script that detects the correct command
# Works on both Linux and Mac

set -e

# Try docker compose (v2) first, then docker-compose (v1)
if docker compose version > /dev/null 2>&1; then
    docker compose "$@"
elif command -v docker-compose > /dev/null 2>&1; then
    docker-compose "$@"
else
    echo "Error: docker-compose or docker compose not found" >&2
    exit 1
fi


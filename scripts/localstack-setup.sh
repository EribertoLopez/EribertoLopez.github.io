#!/bin/bash
# Quick setup script for LocalStack local development
# Usage: ./scripts/localstack-setup.sh [up|down|status|logs]

set -euo pipefail

COMPOSE_FILE="docker-compose.localstack.yml"
ACTION="${1:-up}"

case "$ACTION" in
  up)
    echo "🚀 Starting LocalStack + PostgreSQL..."
    docker compose -f "$COMPOSE_FILE" up -d
    echo ""
    echo "⏳ Waiting for services to be healthy..."
    docker compose -f "$COMPOSE_FILE" ps
    echo ""
    echo "✅ LocalStack: http://localhost:4566/_localstack/health"
    echo "✅ PostgreSQL: localhost:5432 (chatdev/localdev123)"
    echo ""
    echo "Set these environment variables:"
    echo "  export USE_LOCALSTACK=true"
    echo "  export AWS_DEFAULT_REGION=us-east-1"
    echo ""
    echo "Or add to .env.local:"
    echo "  USE_LOCALSTACK=true"
    ;;
  down)
    echo "🛑 Stopping LocalStack..."
    docker compose -f "$COMPOSE_FILE" down
    ;;
  clean)
    echo "🧹 Stopping and removing all data..."
    docker compose -f "$COMPOSE_FILE" down -v
    rm -rf localstack/data
    ;;
  status)
    docker compose -f "$COMPOSE_FILE" ps
    echo ""
    curl -s http://localhost:4566/_localstack/health | python3 -m json.tool 2>/dev/null || echo "LocalStack not running"
    ;;
  logs)
    docker compose -f "$COMPOSE_FILE" logs -f "${2:-localstack}"
    ;;
  *)
    echo "Usage: $0 [up|down|clean|status|logs]"
    exit 1
    ;;
esac

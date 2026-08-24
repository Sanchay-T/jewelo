#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_SCRIPT="${SCRIPT_DIR}/dev-server.mjs"

if [ ! -f "$NODE_SCRIPT" ]; then
  echo "Missing manager script: $NODE_SCRIPT" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node is not available on PATH" >&2
  exit 1
fi

ACTION="${1:-start}"
shift || true

case "$ACTION" in
  start)
    nohup node "$NODE_SCRIPT" start "$@" >/dev/null 2>&1 &
    echo "Started jewelo dev server controller (pid=$!)."
    echo "Use ./scripts/dev-server.sh status to check, and ./scripts/dev-server.sh stop to stop."
    ;;
  status|stop|tail|rotate)
    node "$NODE_SCRIPT" "$ACTION" "$@"
    ;;
  help|--help|-h)
    echo "Usage: ./scripts/dev-server.sh [start|status|stop|tail|rotate]"
    ;;
  *)
    echo "Unknown command: $ACTION" >&2
    echo "Usage: ./scripts/dev-server.sh [start|status|stop|tail|rotate]" >&2
    exit 1
    ;;
esac

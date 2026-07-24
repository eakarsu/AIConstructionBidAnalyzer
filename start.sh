#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -f "$root/.env" ]] || { echo 'Missing .env (copy .env.example and set real values).' >&2; exit 1; }
[[ -d "$root/node_modules" && -d "$root/client/node_modules" ]] || { echo 'Dependencies are missing; run scripts/bootstrap.sh.' >&2; exit 1; }
set -a; . "$root/.env"; set +a
cleanup(){ kill "${backend_pid:-}" "${frontend_pid:-}" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
(cd "$root" && node server/index.js) & backend_pid=$!
(cd "$root/client" && PORT="$FRONTEND_PORT" BROWSER=none npm start) & frontend_pid=$!
wait "$backend_pid" "$frontend_pid"

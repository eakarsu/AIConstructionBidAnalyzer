#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; set -a; . "$root/.env"; set +a
[[ ( "${CONFIRM_DEMO_SEED:-}" == 'yes' || "${CONFIRM_DEMO_SEED:-}" == 'YES' ) && "${NODE_ENV:-development}" != 'production' ]] || { echo 'Set CONFIRM_DEMO_SEED=yes outside production.' >&2; exit 2; }
(cd "$root" && node server/seed.js)

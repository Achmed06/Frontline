#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then
  FRONTLINE_NODE="$(command -v node)"
elif [[ -x /home/muhammed-ali/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ]]; then
  FRONTLINE_NODE=/home/muhammed-ali/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
else
  echo 'Node.js 22.12+ wird benötigt. Danach npm install und npm run dev ausführen.' >&2
  exit 1
fi
if [[ ! -f node_modules/vite/bin/vite.js ]]; then
  echo 'Projekt-Abhängigkeiten fehlen. Zuerst npm install oder pnpm install ausführen.' >&2
  exit 1
fi
exec "$FRONTLINE_NODE" node_modules/vite/bin/vite.js --host 0.0.0.0 --port 5173 --strictPort

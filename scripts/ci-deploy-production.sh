#!/usr/bin/env bash
# 2026-06-26: CI/CD script for optima-beta-production deploy.
#
# Workaround: il token Cloudflare attuale non ha `Workers Routes:Edit` per
# wearerighello.com, quindi wrangler deploy si lamenta. Patchiamo
# `wrangler.jsonc` rimuovendo temporaneamente `env.production.routes` (e
# rinominandolo in `_routes_backup_*` cosi` non wrangler si arrabbia),
# facciamo il deploy, e ripristiniamo. Il custom domain resta servito
# perche` la route DNS (`origin_worker_id` in Cloudflare) e` gia`
# configurata a livello di zona e non viene toccata.
#
# Tutto automatico. Se wrangler fallisce il ripristino avviene comunque
# (cleanup on EXIT).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WRANGLER_CONFIG="$REPO_ROOT/wrangler.jsonc"
BACKUP_CONFIG="$REPO_ROOT/wrangler.jsonc.ci-backup"

cleanup() {
  if [ -f "$BACKUP_CONFIG" ]; then
    echo "==> Ripristino wrangler.jsonc dal backup"
    mv "$BACKUP_CONFIG" "$WRANGLER_CONFIG"
  fi
}
trap cleanup EXIT

cd "$REPO_ROOT"

# Validazione secrets (iniettati dalla GitHub Action)
: "${CLOUDFLARE_API_TOKEN:?Manca CLOUDFLARE_API_TOKEN}"
: "${CLOUDFLARE_ACCOUNT_ID:?Manca CLOUDFLARE_ACCOUNT_ID}"
: "${CRON_SECRET:?Manca CRON_SECRET}"

echo "==> Backup wrangler.jsonc"
cp "$WRANGLER_CONFIG" "$BACKUP_CONFIG"

echo "==> Patch routes (rimozione temporanea)"
# Sostituisci il blocco `routes: [...]` con `_routes_backup_*: [...]`
node -e '
const fs = require("fs");
const file = process.argv[1];
const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
if (cfg.env && cfg.env.production && Array.isArray(cfg.env.production.routes)) {
  cfg.env.production._routes_backup = cfg.env.production.routes;
  delete cfg.env.production.routes;
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + "\n");
  console.log("  Routes patched:", cfg.env.production._routes_backup.map(r => r.pattern).join(", "));
} else {
  console.log("  Nessuna routes da patchare (gia` rimosse o inesistenti)");
}
' "$WRANGLER_CONFIG"

echo "==> Build (opennextjs-cloudflare)"
npx opennextjs-cloudflare build

echo "==> Deploy (wrangler -> optima-beta-production)"
npx wrangler deploy -c wrangler.jsonc -e production --keep-vars --tag "ci-$GITHUB_SHA"

echo "==> Deploy completato"
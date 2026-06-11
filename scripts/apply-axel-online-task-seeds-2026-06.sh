#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${OPTIMA_D1_DATABASE_NAME:-optima-beta-production-db}"

files=(
  "scripts/seed-axel-github-2026-06-04-to-06.sql"
  "scripts/fix-axel-github-duration-2026-06-05.sql"
  "scripts/seed-axel-codex-recovery-2026-06-05-night.sql"
  "scripts/fix-axel-workload-2026-06-06.sql"
  "scripts/fix-axel-current-day-cap-and-june4-2026.sql"
  "scripts/seed-axel-github-2026-06-06-to-11.sql"
  "scripts/mark-fatin-absent-2026-06-10.sql"
)

for file in "${files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing seed file: $file" >&2
    exit 1
  fi
done

for file in "${files[@]}"; do
  echo "Applying $file to $DB_NAME"
  npx wrangler d1 execute "$DB_NAME" --remote --file "$file"
done

echo "Axel task seeds applied to $DB_NAME"

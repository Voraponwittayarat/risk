#!/bin/sh
# RiskHRMS container entrypoint.
# 1. Wait until DATABASE_URL accepts TCP connections.
# 2. Apply reviewed migrations with `prisma migrate deploy` (idempotent).
#    Set SKIP_MIGRATIONS=1 only when a DBA applies migrations manually.
# 3. Start the NestJS server, which also serves the compiled frontend.
set -e

cd /app/backend

node wait-for-db.cjs

if [ "${SKIP_MIGRATIONS}" = "1" ] || [ "${SKIP_MIGRATIONS}" = "true" ]; then
  echo '[riskhrms] SKIP_MIGRATIONS is set; starting without applying migrations.'
else
  echo '[riskhrms] Applying reviewed database migrations (prisma migrate deploy)...'
  ./node_modules/.bin/prisma migrate deploy
fi

exec node dist/src/main.js

# RiskHRMS agent instructions

This repository contains a hospital risk-management system. Treat production data, incident narratives, patient identifiers, credentials, API keys, database dumps, uploads, and logs as sensitive.

## Working rules

- Read `deploy/README-UBUNTU-TH.md` before installation, production updates, database migrations, service changes, or recovery work. `deploy/README-TH.md` is the Windows alternative.
- Never print, copy, commit, or send the contents of `backend/.env`, database dumps, uploads, or patient-identifiable records to an external service.
- Preserve all user changes. Before editing or updating, inspect `git status`, the current branch, and the remote. Never use `git reset --hard`, force-push, or discard a dirty worktree.
- Make code changes on a feature branch. Build and test both applications before proposing deployment:
  - `npm run build` in `frontend`
  - `npm run build` in `backend`
- Do not use `prisma db push` on a production database. Schema changes require a reviewed migration in `backend/prisma/migrations` and production execution through `prisma migrate deploy` only.
- Before every Ubuntu production migration or update, run `deploy/ubuntu/backup-hrms.sh` and verify that the dump exists and has a SHA-256 checksum.
- Deploy only after the operator explicitly requests production deployment. On Ubuntu use `deploy/ubuntu/update-hrms.sh`; do not improvise a manual pull/migrate/restart sequence.
- Do not restore a database, delete data, rewrite Git history, rotate credentials, open firewall ports, or change DNS/TLS without explicit operator approval.
- Keep `backend/.env` local and ignored. Add new configuration keys to `deploy/templates/backend.env.production.example` with safe placeholders.
- After deployment, verify `GET /health`, login, one read-only incident list, and the specific feature changed. Do not create or modify real clinical records merely as a smoke test.

## Architecture

- Frontend: React + Vite in `frontend`; production output is `frontend/dist`.
- Backend: NestJS in `backend`; production entry is `backend/dist/src/main.js`.
- Database: MariaDB/MySQL through Prisma; connection comes from `backend/.env`.
- Primary production target: Ubuntu with systemd using `deploy/ubuntu/riskhrms.service.template`; Windows/PM2 remains available as an alternative.
- In production, NestJS serves the compiled frontend and API from the same origin/port.

Report every change with: files changed, tests run, database impact, backup path (when deployed), running commit, health-check result, and any manual follow-up.

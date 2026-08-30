# Local migration status — 24 August 2026

- Target: `localhost:3306/riskhospital` only. Production was not contacted or modified.
- Full pre-change dump: `backend/backups/riskhospital-before-nrls-rca-capa-20260824.sql` (15,566,044 bytes; mysqldump exit 0).
- Before: 4,796 Incidents; 6 with NRLS; 4,790 without NRLS.
- Applied deterministic mappings: 4,404.
- After: 4,410 with valid NRLS; 386 legacy rows without NRLS; invalid NRLS 0.
- Cutover decision: the 386 unmatched historical rows are marked `LEGACY` and are not queued for retrospective NRLS correction. Full NRLS enforcement starts 1 October 2026 (1 October 2569 BE).
- Cutover audit: 386 audit rows; incidents without NRLS on/after cutover: 0.
- Program mismatches: 811; these were not silently corrected and are `NEEDS_REVIEW`.
- Severity incompatibilities: 530; these remain visible for RM review.
- Classification after migration: `AUTO_MAPPED` 3,593; `NEEDS_REVIEW` 815; `CONFIRMED` 1; `PENDING` 1; legacy null 386.
- Row count and composite count stayed 4,796; snapshot mismatch 0; migration audit count 4,404.
- Idempotency rerun updated 0 rows.
- Rollback was tested on `riskhospital_rollback_test_20260824`; all 4,404 rows were restored and the original baseline returned exactly.
- End-to-end smoke test on the copy passed Incident → Classification → RCA → CAPA → Monitoring → close.

Patient-safe reports are under `backend/reports/nrls-backfill/`. They contain no `detail` or `detail_hosxp`.

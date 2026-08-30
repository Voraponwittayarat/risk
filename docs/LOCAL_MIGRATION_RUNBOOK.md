# Local legacy NRLS migration runbook

All commands must run from `backend` and refuse non-local `DATABASE_URL` values.

```powershell
node scripts/audit_legacy_nrls_backfill.js --run-id=YYYYMMDD-audit
node scripts/backup_legacy_nrls_backfill.js --run-id=YYYYMMDD-run1
node scripts/migrate_legacy_nrls_backfill.js --run-id=YYYYMMDD-run1
node scripts/migrate_legacy_nrls_backfill.js --apply --run-id=YYYYMMDD-run1 --batch-size=200
node scripts/migrate_legacy_nrls_backfill.js --apply --run-id=YYYYMMDD-run1 --batch-size=200
node scripts/verify_legacy_nrls_backfill.js --verify --run-id=YYYYMMDD-run1
```

The first migrate command is dry-run. The second apply with the same run ID must report `updated: 0`. Reports contain only Incident ID, `id_risk`, local risk identifiers, NRLS, program, severity, department, date, and reasons—never `detail` or `detail_hosxp`.

Rollback on a database copy:

```powershell
node scripts/rollback_legacy_nrls_backfill.js --rollback --run-id=YYYYMMDD-run1
```

After rollback, rerun the audit and compare total rows/composite keys with the pre-apply report. Keep `nrls_code` nullable until invalid NRLS is zero and RM has signed off every program/severity conflict.

# Delivery summary — NRLS, RCA, CAPA, Monitoring and legacy migration

## Architecture delivered

- NRLS is canonical; local risk is optional supporting context.
- Backend-only RCA policy version `WC-RCA-2026.08-NRLS-1` persists evaluation reason and SLA snapshot.
- Central `capa_action` preserves legacy RCA/CAPA tables while providing one Monitoring read model.
- Risk Profile identity is NRLS + scope level + scope identifier; period counts are computed from confirmed Incidents.
- Full NRLS enforcement and Monitoring counting start on 1 October 2026 (1 October 2569 BE). The 386 unmatched historical incidents remain `LEGACY` and are excluded from mandatory Data Quality correction.
- JWT, role, assignment and department/group/hospital scope checks cover RCA, CAPA, Risk Analysis and Data Quality APIs.

## Local migration result

| Metric | Before | After |
|---|---:|---:|
| Total Incident rows | 4,796 | 4,796 |
| Valid NRLS | 6 | 4,410 |
| Without NRLS | 4,790 | 386 |
| Invalid NRLS | 0 | 0 |
| Deterministic auto-map | — | 4,404 |
| Program mismatch | 811 | 811 (`NEEDS_REVIEW`) |
| Severity incompatibility | 530 | 530 (review queue) |
| Composite-key anomaly | 0 | 0 |

Newly auto-mapped classifications are 3,593 `AUTO_MAPPED` and 811 `NEEDS_REVIEW` because of program mismatch. Four earlier records were already `NEEDS_REVIEW`, so the final status total is 815. The 386 unmapped legacy records remain nullable and visible.

## Verification

- Backup and dry-run completed before apply.
- Apply updated 4,404; rerun updated 0.
- Audit count 4,404; NRLS snapshot mismatch 0.
- Rollback copy restored 4,404 and reproduced the pre-migration counts.
- Backend: 29 tests passed; Prisma validate and Nest build passed.
- Frontend build passed.
- Smoke test on isolated copy passed the full workflow.
- Query plans use NRLS/CAPA indexes; a composite NRLS-period-scope-classification index was added for aggregate workloads.

## RM decisions remaining

- No retrospective classification is required for the 386 unmatched legacy incidents. Review only mapped records flagged for program/severity conflict.
- Decide 811 historical program mismatches through the Classification endpoint.
- Decide 530 severity incompatibilities; the migration did not invent clinical corrections.
- Approve final RCA SLA values and whether moderate non-nine-standard events use Mini or Concise RCA.

## Rollback

Use `rollback_legacy_nrls_backfill.js --rollback --run-id=nrls-backfill-20260824` only after a fresh backup and only on the intended local/staging database. A full pre-change SQL dump is also available. Production MariaDB-wsrep 5.5 requires the separate deployment plan and must not receive these migrations directly.

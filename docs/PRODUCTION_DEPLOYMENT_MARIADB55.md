# Production deployment notes — MariaDB-wsrep 5.5.63

## Status

The migration in `20260824120000_nrls_rca_monitoring_capa` is **local/staging only**. Do not execute it directly against the hospital production cluster. This work must not be described as production-ready until it passes staging that mirrors the real server and data volume.

## MariaDB 5.5 / MyISAM / Galera risks

- Prisma 5 and the generated schema are not a supported deployment contract for MariaDB 5.5.
- The migration uses multi-column indexes, InnoDB foreign keys, timestamp defaults, and transactional assumptions that require compatibility testing.
- MyISAM does not provide transactions or foreign keys. A transaction that spans legacy MyISAM and new InnoDB tables is not atomic.
- Galera/wsrep 5.5 has stricter DDL and total-order-isolation behavior. Large `ALTER TABLE` operations can block the cluster, create replication pressure, or require a full table copy.
- Unique indexes may fail if production has historical duplicates not present locally.
- Index length/collation limits differ. Validate `utf8mb4`, row format, and the 191-character notification key.
- Do not use `prisma migrate deploy` on the production cluster.

## Recommended path

1. Run the read-only audit against a sanitized production snapshot in isolated staging.
2. Restore that snapshot to MariaDB 10.11 (recommended separate database for the modern service).
3. Execute backup and dry-run; review row counts and query plans.
4. Apply in batches, rerun to prove idempotency, verify, and test rollback on a copy.
5. Run the end-to-end Incident → classification → RCA → CAPA → Monitoring → close scenario.
6. Obtain RM sign-off for mappings and DBA sign-off for DDL/query plans.
7. Plan a controlled cutover or dual-read period. Keep the original database read-only during validation.

Telegram may carry only the configured short, masked incident summary; never send `detail_hosxp`, full clinical narratives, or attachments. Production secrets belong in a secret manager/environment injection, not source control.

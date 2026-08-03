# Database Index & Engine Strategy

## 1. Storage Engine Migration (MyISAM to InnoDB)
The legacy database currently relies heavily on `MyISAM`. This engine causes table-level locking, which severely degrades performance during concurrent reporting, and lacks Foreign Key support, endangering data integrity.

### Phased Migration Plan
1. **Target Identification**: Isolate read-heavy vs write-heavy tables. Write-heavy tables (`riskregister`, `edit_log`) take priority.
2. **Safe Conversion**: Execute `ALTER TABLE <table_name> ENGINE=InnoDB;` during low-traffic hours (e.g., 02:00 AM).
3. **Rollback**: If application deadlocks occur, immediate reversion via `ALTER TABLE <table_name> ENGINE=MyISAM;`.

## 2. Indexing Strategy
To optimize query performance for Dashboards and LINE Notify lookups, the following B-Tree indexes will be established:

### Foreign Keys & Joins
- `riskregister(department_id)`
- `riskregister(level_id)`
- `riskregister(riskstore_id)`
- `riskregister(inform_id)`

### Search & Filtering
- `riskregister(date_report)`: Critical for timeframe-based Dashboard metrics.
- `riskregister(status_risk)`: Required for fast "Pending Review" queue rendering.

### Lookup Optimization
- `riskregister(link_key)`: Unique index. Used heavily by the `actionLink` controller to load incidents from LINE messages. Without this, external clicks trigger full-table scans.

-- Store the selected NRLS fiscal-year 2569 contributing-factor codes as JSON text.
-- TEXT is used for MariaDB 5.5 compatibility (native JSON is unavailable there).
-- Legacy tables contain zero-date defaults; relax SQL mode only for this migration session.
SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION';

ALTER TABLE riskreview
  ADD COLUMN contributing_factors TEXT NULL;

ALTER TABLE rca_case
  ADD COLUMN contributing_factors TEXT NULL;

ALTER TABLE standard_rca_case
  ADD COLUMN contributing_factors TEXT NULL;

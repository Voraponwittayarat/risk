-- LOCAL/STAGING ONLY. Composite covering prefix for NRLS period/scope aggregation.
SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION';
ALTER TABLE riskregister
  ADD INDEX idx_incident_nrls_period_scope_class (nrls_code, date_report, department_id, classification_status);

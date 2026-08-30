-- LOCAL/STAGING rollback. Run only after backing up current data.
DROP TABLE IF EXISTS notification_log;
DROP TABLE IF EXISTS workflow_audit;
DROP TABLE IF EXISTS capa_action;
DROP TABLE IF EXISTS legacy_nrls_backfill_backup;
DROP TABLE IF EXISTS legacy_nrls_backfill_run;
ALTER TABLE riskanalysis_review DROP COLUMN period_start, DROP COLUMN period_end, DROP COLUMN calculation_snapshot;
ALTER TABLE riskanalysis DROP INDEX uq_riskanalysis_nrls_scope, DROP INDEX idx_riskanalysis_nrls_scope,
  DROP INDEX idx_riskanalysis_next_review, DROP COLUMN nrls_code, DROP COLUMN nrls_name_snapshot,
  DROP COLUMN scope_identifier, DROP COLUMN risk_owner_user_id, DROP COLUMN risk_owner_member_cid,
  DROP COLUMN risk_owner_team_id, DROP COLUMN period_start, DROP COLUMN period_end, DROP COLUMN last_calculated_at;
ALTER TABLE standard_rca_capa DROP INDEX uq_standard_capa_action, DROP COLUMN capa_action_id;
ALTER TABLE standard_rca_case DROP INDEX uq_standard_rca_incident, DROP INDEX idx_standard_rca_nrls_status_due,
  DROP COLUMN nrls_code, DROP COLUMN nrls_name_snapshot, DROP COLUMN program_id, DROP COLUMN department_id,
  DROP COLUMN assigned_team_id, DROP COLUMN assigned_member_cid, DROP COLUMN due_at, DROP COLUMN completed_at;
ALTER TABLE rca_cmp DROP INDEX uq_rca_cmp_capa_action, DROP COLUMN capa_action_id;
ALTER TABLE rca_incident_item DROP COLUMN nrls_code, DROP COLUMN nrls_name_snapshot, DROP COLUMN program_id;
ALTER TABLE rca_case DROP INDEX uq_rca_case_incident_type, DROP INDEX idx_rca_case_nrls_status_due,
  DROP COLUMN nrls_code, DROP COLUMN nrls_name_snapshot, DROP COLUMN program_id, DROP COLUMN incident_id,
  DROP COLUMN incident_id_risk, DROP COLUMN severity, DROP COLUMN department_id, DROP COLUMN assigned_team_id,
  DROP COLUMN assigned_member_cid, DROP COLUMN due_at, DROP COLUMN completed_at, DROP COLUMN status;
ALTER TABLE riskregister DROP INDEX idx_riskregister_nrls, DROP INDEX idx_riskregister_program,
  DROP INDEX idx_riskregister_department, DROP INDEX idx_riskregister_date_report,
  DROP INDEX idx_riskregister_classification, DROP COLUMN recommended_rca_type, DROP COLUMN rca_due_at,
  DROP COLUMN rca_policy_version, DROP COLUMN rca_evaluation_snapshot;

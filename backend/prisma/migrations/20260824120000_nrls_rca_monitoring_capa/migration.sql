-- LOCAL/STAGING ONLY. Do not apply directly to MariaDB-wsrep 5.5 or MyISAM production tables.
-- Legacy tables contain zero-date defaults; relax SQL mode only for this migration session.
SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION';

ALTER TABLE riskregister
  ADD COLUMN recommended_rca_type VARCHAR(20) NULL,
  ADD COLUMN rca_due_at DATETIME NULL,
  ADD COLUMN rca_policy_version VARCHAR(50) NULL,
  ADD COLUMN rca_evaluation_snapshot TEXT NULL,
  ADD INDEX idx_riskregister_nrls (nrls_code),
  ADD INDEX idx_riskregister_program (program_id),
  ADD INDEX idx_riskregister_department (department_id),
  ADD INDEX idx_riskregister_date_report (date_report),
  ADD INDEX idx_riskregister_classification (classification_status);

ALTER TABLE rca_case
  ADD COLUMN nrls_code VARCHAR(50) NULL, ADD COLUMN nrls_name_snapshot TEXT NULL,
  ADD COLUMN program_id INT NULL, ADD COLUMN incident_id INT NULL, ADD COLUMN incident_id_risk INT NULL,
  ADD COLUMN severity VARCHAR(10) NULL, ADD COLUMN department_id VARCHAR(10) NULL,
  ADD COLUMN assigned_team_id INT NULL, ADD COLUMN assigned_member_cid VARCHAR(13) NULL,
  ADD COLUMN due_at DATETIME NULL, ADD COLUMN completed_at DATETIME NULL,
  ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  ADD UNIQUE KEY uq_rca_case_incident_type (incident_id, rca_type),
  ADD INDEX idx_rca_case_nrls_status_due (nrls_code, status, due_at);

ALTER TABLE rca_incident_item
  ADD COLUMN nrls_code VARCHAR(50) NULL, ADD COLUMN nrls_name_snapshot TEXT NULL, ADD COLUMN program_id INT NULL;
ALTER TABLE rca_cmp ADD COLUMN capa_action_id INT NULL, ADD UNIQUE KEY uq_rca_cmp_capa_action (capa_action_id);

ALTER TABLE standard_rca_case
  ADD COLUMN nrls_code VARCHAR(50) NULL, ADD COLUMN nrls_name_snapshot TEXT NULL, ADD COLUMN program_id INT NULL,
  ADD COLUMN department_id VARCHAR(10) NULL, ADD COLUMN assigned_team_id INT NULL,
  ADD COLUMN assigned_member_cid VARCHAR(13) NULL, ADD COLUMN due_at DATETIME NULL, ADD COLUMN completed_at DATETIME NULL,
  ADD UNIQUE KEY uq_standard_rca_incident (incident_id),
  ADD INDEX idx_standard_rca_nrls_status_due (nrls_code, status, due_at);
ALTER TABLE standard_rca_capa ADD COLUMN capa_action_id INT NULL, ADD UNIQUE KEY uq_standard_capa_action (capa_action_id);

ALTER TABLE riskanalysis
  ADD COLUMN nrls_code VARCHAR(50) NULL, ADD COLUMN nrls_name_snapshot TEXT NULL,
  ADD COLUMN scope_identifier VARCHAR(50) NOT NULL DEFAULT '1',
  ADD COLUMN risk_owner_user_id INT NULL, ADD COLUMN risk_owner_member_cid VARCHAR(13) NULL,
  ADD COLUMN risk_owner_team_id INT NULL, ADD COLUMN period_start DATE NULL, ADD COLUMN period_end DATE NULL,
  ADD COLUMN last_calculated_at DATETIME NULL,
  ADD UNIQUE KEY uq_riskanalysis_nrls_scope (nrls_code, scope_level, scope_identifier),
  ADD INDEX idx_riskanalysis_nrls_scope (nrls_code, scope_level, department_id),
  ADD INDEX idx_riskanalysis_next_review (next_review_date);
ALTER TABLE riskanalysis_review
  ADD COLUMN period_start DATE NULL, ADD COLUMN period_end DATE NULL, ADD COLUMN calculation_snapshot TEXT NULL;

CREATE TABLE capa_action (
  id INT NOT NULL AUTO_INCREMENT, source_type VARCHAR(30) NOT NULL, source_id VARCHAR(50) NOT NULL, source_item_id INT NULL,
  incident_id INT NOT NULL, incident_id_risk INT NOT NULL, nrls_code VARCHAR(50) NOT NULL, risk_analysis_id INT NULL,
  action TEXT NOT NULL, action_type VARCHAR(20) NOT NULL, responsible_member_cid VARCHAR(13) NULL,
  responsible_user_id INT NULL, responsible_team_id INT NULL, responsible_department_id VARCHAR(10) NULL,
  responsible_display_name VARCHAR(255) NULL, due_date DATE NULL, status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  completed_at DATETIME NULL, evidence TEXT NULL, last_notified_at DATETIME NULL, created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_capa_source_item (source_type, source_id, source_item_id),
  KEY idx_capa_nrls_status_due (nrls_code, status, due_date),
  KEY idx_capa_responsible (responsible_user_id, responsible_member_cid, responsible_department_id),
  CONSTRAINT fk_capa_riskanalysis FOREIGN KEY (risk_analysis_id) REFERENCES riskanalysis(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE workflow_audit (
  id INT NOT NULL AUTO_INCREMENT, entity_type VARCHAR(30) NOT NULL, entity_id VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL, old_value TEXT NULL, new_value TEXT NULL, reason TEXT NULL, changed_by INT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (id),
  KEY idx_workflow_audit_entity (entity_type, entity_id, changed_at)
) ENGINE=InnoDB;

CREATE TABLE notification_log (
  id INT NOT NULL AUTO_INCREMENT, notification_key VARCHAR(191) NOT NULL, entity_type VARCHAR(30) NOT NULL,
  entity_id VARCHAR(50) NOT NULL, notification_type VARCHAR(30) NOT NULL, channel VARCHAR(20) NOT NULL DEFAULT 'IN_APP',
  notified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, recipient_scope VARCHAR(100) NULL, PRIMARY KEY (id),
  UNIQUE KEY uq_notification_key (notification_key), KEY idx_notification_entity_type (entity_type, notification_type, notified_at)
) ENGINE=InnoDB;

CREATE TABLE legacy_nrls_backfill_backup (
  run_id VARCHAR(50) NOT NULL, incident_id INT NOT NULL, id_risk INT NOT NULL,
  old_nrls_code VARCHAR(50) NULL, old_nrls_name_snapshot TEXT NULL, old_classification_status VARCHAR(20) NULL,
  old_program_id INT NULL, backed_up_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (run_id, incident_id, id_risk)
) ENGINE=InnoDB;

CREATE TABLE legacy_nrls_backfill_run (
  run_id VARCHAR(50) NOT NULL, total_rows_before INT NOT NULL, composite_rows_before INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (run_id)
) ENGINE=InnoDB;

-- P2 closed-loop review, RCA/CAPA effectiveness and SLA monitoring.
-- LOCAL/STAGING ONLY. Validate against a production copy before applying to MariaDB-wsrep 5.5.
SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION';

ALTER TABLE riskregister
  ADD COLUMN operational_closed_at DATETIME NULL,
  ADD COLUMN improvement_status VARCHAR(30) NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN effectiveness_closed_at DATETIME NULL;

ALTER TABLE capa_action
  ADD COLUMN effectiveness_criteria TEXT NULL,
  ADD COLUMN baseline_value VARCHAR(255) NULL,
  ADD COLUMN target_value VARCHAR(255) NULL,
  ADD COLUMN effectiveness_due_date DATE NULL,
  ADD COLUMN effectiveness_status VARCHAR(30) NOT NULL DEFAULT 'NOT_DUE',
  ADD COLUMN implementation_verified_by INT NULL,
  ADD COLUMN implementation_verified_at DATETIME NULL,
  ADD COLUMN approval_status VARCHAR(30) NOT NULL DEFAULT 'NOT_READY',
  ADD COLUMN approved_by INT NULL,
  ADD COLUMN approved_at DATETIME NULL,
  ADD COLUMN closed_at DATETIME NULL,
  ADD COLUMN revision INT NOT NULL DEFAULT 1,
  ADD COLUMN escalation_level INT NOT NULL DEFAULT 0,
  ADD COLUMN last_escalated_at DATETIME NULL;

-- A legacy COMPLETED action only proves implementation. It must still pass an
-- independent effectiveness review before RM can close it.
UPDATE capa_action
SET status = 'IMPLEMENTED',
    effectiveness_status = 'PENDING',
    approval_status = 'NOT_READY',
    implementation_verified_at = COALESCE(completed_at, updated_at)
WHERE UPPER(status) = 'COMPLETED';

CREATE TABLE incident_review_entry (
  id INT NOT NULL AUTO_INCREMENT,
  incident_id INT NOT NULL,
  incident_id_risk INT NOT NULL,
  review_role VARCHAR(20) NOT NULL,
  review_status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
  reviewer_user_id INT NULL,
  reviewer_member_cid VARCHAR(13) NULL,
  reviewer_department_id VARCHAR(10) NULL,
  reviewer_team_id INT NULL,
  findings TEXT NULL,
  recommendation TEXT NULL,
  decision VARCHAR(30) NULL,
  returned_reason TEXT NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at DATETIME NULL,
  accepted_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_incident_review_role (incident_id, incident_id_risk, review_role, submitted_at),
  KEY idx_incident_review_actor (reviewer_user_id, reviewer_department_id, reviewer_team_id)
) ENGINE=InnoDB;

CREATE TABLE capa_effectiveness_review (
  id INT NOT NULL AUTO_INCREMENT,
  capa_action_id INT NOT NULL,
  review_date DATE NOT NULL,
  result VARCHAR(30) NOT NULL,
  measured_value VARCHAR(255) NULL,
  observation TEXT NOT NULL,
  evidence TEXT NULL,
  followup_required TINYINT(1) NOT NULL DEFAULT 0,
  reviewer_user_id INT NULL,
  reviewer_member_cid VARCHAR(13) NULL,
  reviewer_role VARCHAR(30) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_capa_effectiveness (capa_action_id, review_date, result),
  CONSTRAINT fk_effectiveness_capa FOREIGN KEY (capa_action_id) REFERENCES capa_action(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE sla_policy (
  id INT NOT NULL AUTO_INCREMENT,
  workflow_stage VARCHAR(40) NOT NULL,
  severity_group VARCHAR(20) NOT NULL,
  duration_hours INT NOT NULL,
  escalation_level1_hours INT NOT NULL DEFAULT 0,
  escalation_level2_hours INT NOT NULL DEFAULT 24,
  escalation_level3_hours INT NOT NULL DEFAULT 72,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sla_policy_stage_severity (workflow_stage, severity_group)
) ENGINE=InnoDB;

CREATE TABLE sla_instance (
  id INT NOT NULL AUTO_INCREMENT,
  policy_id INT NULL,
  entity_type VARCHAR(30) NOT NULL,
  entity_id VARCHAR(50) NOT NULL,
  workflow_stage VARCHAR(40) NOT NULL,
  severity VARCHAR(10) NULL,
  owner_user_id INT NULL,
  owner_department_id VARCHAR(10) NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_at DATETIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  breached_at DATETIME NULL,
  completed_at DATETIME NULL,
  paused_at DATETIME NULL,
  pause_reason TEXT NULL,
  escalation_level INT NOT NULL DEFAULT 0,
  last_escalated_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sla_entity_stage (entity_type, entity_id, workflow_stage),
  KEY idx_sla_due_escalation (status, due_at, escalation_level),
  KEY idx_sla_owner (owner_user_id, owner_department_id),
  CONSTRAINT fk_sla_policy FOREIGN KEY (policy_id) REFERENCES sla_policy(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE escalation_event (
  id INT NOT NULL AUTO_INCREMENT,
  sla_instance_id INT NOT NULL,
  escalation_level INT NOT NULL,
  target_role VARCHAR(30) NOT NULL,
  target_user_id INT NULL,
  target_department_id VARCHAR(10) NULL,
  reason TEXT NOT NULL,
  notified_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  resolved_by INT NULL,
  PRIMARY KEY (id),
  KEY idx_escalation_instance (sla_instance_id, escalation_level, notified_at),
  KEY idx_escalation_target (target_role, target_user_id, target_department_id),
  CONSTRAINT fk_escalation_sla FOREIGN KEY (sla_instance_id) REFERENCES sla_instance(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT INTO sla_policy
  (workflow_stage, severity_group, duration_hours, escalation_level1_hours, escalation_level2_hours, escalation_level3_hours)
VALUES
  ('REVIEW_OWNER', 'LOW', 336, 0, 24, 72),
  ('REVIEW_OWNER', 'MEDIUM', 168, 0, 24, 72),
  ('REVIEW_OWNER', 'HIGH', 72, 0, 24, 72),
  ('REVIEW_OWNER', 'CRITICAL', 24, 0, 12, 24),
  ('RCA_DOCUMENT', 'LOW', 720, 0, 48, 120),
  ('RCA_DOCUMENT', 'MEDIUM', 336, 0, 48, 120),
  ('RCA_DOCUMENT', 'HIGH', 168, 0, 24, 72),
  ('RCA_DOCUMENT', 'CRITICAL', 72, 0, 12, 24),
  ('CAPA_IMPLEMENTATION', 'LOW', 720, 0, 48, 120),
  ('CAPA_IMPLEMENTATION', 'MEDIUM', 336, 0, 48, 120),
  ('CAPA_IMPLEMENTATION', 'HIGH', 168, 0, 24, 72),
  ('CAPA_IMPLEMENTATION', 'CRITICAL', 72, 0, 12, 24),
  ('CAPA_EFFECTIVENESS', 'LOW', 2160, 0, 72, 168),
  ('CAPA_EFFECTIVENESS', 'MEDIUM', 1440, 0, 72, 168),
  ('CAPA_EFFECTIVENESS', 'HIGH', 720, 0, 48, 120),
  ('CAPA_EFFECTIVENESS', 'CRITICAL', 336, 0, 24, 72)
ON DUPLICATE KEY UPDATE
  duration_hours = VALUES(duration_hours),
  escalation_level1_hours = VALUES(escalation_level1_hours),
  escalation_level2_hours = VALUES(escalation_level2_hours),
  escalation_level3_hours = VALUES(escalation_level3_hours),
  active = 1;

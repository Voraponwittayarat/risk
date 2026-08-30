-- P2 rollback. Back up data before running because review/effectiveness history is removed.
DROP TABLE IF EXISTS escalation_event;
DROP TABLE IF EXISTS sla_instance;
DROP TABLE IF EXISTS sla_policy;
DROP TABLE IF EXISTS capa_effectiveness_review;
DROP TABLE IF EXISTS incident_review_entry;

ALTER TABLE capa_action
  DROP COLUMN effectiveness_criteria,
  DROP COLUMN baseline_value,
  DROP COLUMN target_value,
  DROP COLUMN effectiveness_due_date,
  DROP COLUMN effectiveness_status,
  DROP COLUMN implementation_verified_by,
  DROP COLUMN implementation_verified_at,
  DROP COLUMN approval_status,
  DROP COLUMN approved_by,
  DROP COLUMN approved_at,
  DROP COLUMN closed_at,
  DROP COLUMN revision,
  DROP COLUMN escalation_level,
  DROP COLUMN last_escalated_at;

ALTER TABLE riskregister
  DROP COLUMN operational_closed_at,
  DROP COLUMN improvement_status,
  DROP COLUMN effectiveness_closed_at;

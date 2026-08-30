-- Backfill P2 lifecycle fields for incidents and CAPAs created before the closed-loop release.
SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION';

UPDATE riskregister AS incident
LEFT JOIN (
  SELECT
    incident_id,
    incident_id_risk,
    COUNT(*) AS total_count,
    SUM(CASE WHEN UPPER(status) = 'CLOSED' THEN 1 ELSE 0 END) AS closed_count,
    SUM(CASE WHEN UPPER(status) NOT IN ('CLOSED', 'CANCELLED') THEN 1 ELSE 0 END) AS active_count,
    MAX(closed_at) AS latest_effectiveness_close
  FROM capa_action
  GROUP BY incident_id, incident_id_risk
) AS capa
  ON capa.incident_id = incident.id
 AND capa.incident_id_risk = incident.id_risk
SET
  incident.operational_closed_at = CASE
    WHEN incident.status_risk IN ('จำหน่าย', 'ไม่ใช่ความเสี่ยง')
      THEN COALESCE(incident.operational_closed_at, incident.modify_date, incident.send_date, incident.create_date, NOW())
    ELSE incident.operational_closed_at
  END,
  incident.improvement_status = CASE
    WHEN incident.status_risk = 'ไม่ใช่ความเสี่ยง' THEN 'NOT_REQUIRED'
    WHEN COALESCE(capa.total_count, 0) = 0 AND incident.status_risk = 'จำหน่าย' THEN 'NOT_REQUIRED'
    WHEN COALESCE(capa.total_count, 0) = 0 THEN COALESCE(incident.improvement_status, 'NOT_STARTED')
    WHEN COALESCE(capa.active_count, 0) = 0 AND COALESCE(capa.closed_count, 0) > 0 THEN 'CLOSED'
    ELSE 'MONITORING'
  END,
  incident.effectiveness_closed_at = CASE
    WHEN COALESCE(capa.active_count, 0) = 0 AND COALESCE(capa.closed_count, 0) > 0
      THEN COALESCE(incident.effectiveness_closed_at, capa.latest_effectiveness_close)
    ELSE NULL
  END;

-- Existing open CAPAs also need an active SLA. IMPLEMENTED means the measure was
-- performed but has not passed effectiveness review, so it enters that stage.
INSERT INTO sla_instance (
  policy_id, entity_type, entity_id, workflow_stage, severity,
  owner_user_id, owner_department_id, started_at, due_at, status
)
SELECT
  policy.id,
  'CAPA',
  CAST(capa.id AS CHAR),
  CASE
    WHEN UPPER(capa.status) IN ('IMPLEMENTED', 'AWAITING_EFFECTIVENESS', 'AWAITING_APPROVAL')
      THEN 'CAPA_EFFECTIVENESS'
    ELSE 'CAPA_IMPLEMENTATION'
  END,
  incident.level_id,
  capa.responsible_user_id,
  capa.responsible_department_id,
  COALESCE(capa.created_at, NOW()),
  CASE
    WHEN UPPER(capa.status) IN ('IMPLEMENTED', 'AWAITING_EFFECTIVENESS', 'AWAITING_APPROVAL')
      THEN COALESCE(
        DATE_ADD(capa.effectiveness_due_date, INTERVAL 86399 SECOND),
        DATE_ADD(COALESCE(capa.completed_at, capa.due_date, capa.created_at, NOW()), INTERVAL policy.duration_hours HOUR)
      )
    ELSE COALESCE(
      DATE_ADD(capa.due_date, INTERVAL 86399 SECOND),
      DATE_ADD(COALESCE(capa.created_at, NOW()), INTERVAL policy.duration_hours HOUR)
    )
  END,
  'ACTIVE'
FROM capa_action AS capa
INNER JOIN riskregister AS incident
  ON incident.id = capa.incident_id
 AND incident.id_risk = capa.incident_id_risk
INNER JOIN sla_policy AS policy
  ON policy.workflow_stage = CASE
    WHEN UPPER(capa.status) IN ('IMPLEMENTED', 'AWAITING_EFFECTIVENESS', 'AWAITING_APPROVAL')
      THEN 'CAPA_EFFECTIVENESS'
    ELSE 'CAPA_IMPLEMENTATION'
  END
 AND policy.severity_group = CASE
    WHEN UPPER(incident.level_id) IN ('G', 'H', 'I', '4', '5') THEN 'CRITICAL'
    WHEN UPPER(incident.level_id) IN ('E', 'F', '3') THEN 'HIGH'
    WHEN UPPER(incident.level_id) IN ('C', 'D', '2') THEN 'MEDIUM'
    ELSE 'LOW'
  END
WHERE UPPER(capa.status) NOT IN ('CLOSED', 'CANCELLED')
ON DUPLICATE KEY UPDATE
  policy_id = VALUES(policy_id),
  owner_user_id = VALUES(owner_user_id),
  owner_department_id = VALUES(owner_department_id),
  due_at = VALUES(due_at),
  status = 'ACTIVE',
  updated_at = CURRENT_TIMESTAMP;

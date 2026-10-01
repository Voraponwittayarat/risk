-- Close the legacy review backlog before the FY2570 workflow starts.
-- The temporary table freezes the target set so the audit, incident update,
-- and SLA completion always refer to the same historical incidents.
CREATE TEMPORARY TABLE `legacy_review_incidents_to_close` (
  `id` INT NOT NULL,
  `id_risk` INT NOT NULL,
  PRIMARY KEY (`id`, `id_risk`)
);

INSERT INTO `legacy_review_incidents_to_close` (`id`, `id_risk`)
SELECT `id`, `id_risk`
FROM `riskregister`
WHERE `status_risk` = 'ทบทวน'
  AND `date_report` < '2026-10-01'
  AND `create_date` < '2026-10-01';

INSERT INTO `workflow_audit` (
  `entity_type`, `entity_id`, `action`, `old_value`, `new_value`,
  `reason`, `changed_by`, `changed_at`
)
SELECT
  'INCIDENT',
  CAST(incident.`id` AS CHAR),
  'LEGACY_REVIEW_BULK_CLOSED',
  JSON_OBJECT(
    'status_risk', incident.`status_risk`,
    'rca_required', incident.`rca_required`,
    'rca_status', incident.`rca_status`,
    'team_review_status', incident.`team_review_status`
  ),
  JSON_OBJECT(
    'status_risk', 'จำหน่าย',
    'rca_required', FALSE,
    'rca_status', CASE
      WHEN UPPER(COALESCE(incident.`rca_status`, '')) = 'COMPLETED' THEN 'COMPLETED'
      ELSE 'NONE'
    END,
    'legacy_cutoff', '2026-10-01'
  ),
  'ปิดรายการค้างทบทวนเดิมก่อนเริ่ม Workflow ปีงบประมาณ 2570 ตามคำสั่งผู้ดูแลระบบ',
  NULL,
  NOW()
FROM `riskregister` AS incident
INNER JOIN `legacy_review_incidents_to_close` AS target
  ON target.`id` = incident.`id`
 AND target.`id_risk` = incident.`id_risk`;

UPDATE `riskregister` AS incident
INNER JOIN `legacy_review_incidents_to_close` AS target
  ON target.`id` = incident.`id`
 AND target.`id_risk` = incident.`id_risk`
LEFT JOIN (
  SELECT
    `incident_id`,
    `incident_id_risk`,
    COUNT(*) AS `total_count`,
    SUM(CASE WHEN UPPER(`status`) = 'CLOSED' THEN 1 ELSE 0 END) AS `closed_count`,
    SUM(CASE WHEN UPPER(`status`) NOT IN ('CLOSED', 'CANCELLED') THEN 1 ELSE 0 END) AS `active_count`,
    MAX(`closed_at`) AS `latest_effectiveness_close`
  FROM `capa_action`
  GROUP BY `incident_id`, `incident_id_risk`
) AS capa
  ON capa.`incident_id` = incident.`id`
 AND capa.`incident_id_risk` = incident.`id_risk`
SET
  incident.`status_risk` = 'จำหน่าย',
  incident.`operational_closed_at` = COALESCE(incident.`operational_closed_at`, NOW()),
  incident.`modify_date` = NOW(),
  incident.`team_review_status` = CASE
    WHEN incident.`sendto_team_id` IS NOT NULL THEN 'COMPLETED'
    ELSE incident.`team_review_status`
  END,
  incident.`team_review_completed_at` = CASE
    WHEN incident.`sendto_team_id` IS NOT NULL
      THEN COALESCE(incident.`team_review_completed_at`, NOW())
    ELSE incident.`team_review_completed_at`
  END,
  incident.`rca_required` = FALSE,
  incident.`rca_status` = CASE
    WHEN UPPER(COALESCE(incident.`rca_status`, '')) = 'COMPLETED' THEN 'COMPLETED'
    ELSE 'NONE'
  END,
  incident.`rca_due_at` = NULL,
  incident.`improvement_status` = CASE
    WHEN COALESCE(capa.`total_count`, 0) = 0 THEN 'NOT_REQUIRED'
    WHEN COALESCE(capa.`active_count`, 0) = 0 AND COALESCE(capa.`closed_count`, 0) > 0 THEN 'CLOSED'
    ELSE 'MONITORING'
  END,
  incident.`effectiveness_closed_at` = CASE
    WHEN COALESCE(capa.`active_count`, 0) = 0 AND COALESCE(capa.`closed_count`, 0) > 0
      THEN COALESCE(incident.`effectiveness_closed_at`, capa.`latest_effectiveness_close`, NOW())
    WHEN COALESCE(capa.`active_count`, 0) > 0 THEN NULL
    ELSE incident.`effectiveness_closed_at`
  END;

UPDATE `sla_instance` AS sla
INNER JOIN `legacy_review_incidents_to_close` AS target
  ON sla.`entity_type` = 'INCIDENT'
 AND sla.`entity_id` = CAST(target.`id` AS CHAR)
SET
  sla.`status` = 'COMPLETED',
  sla.`completed_at` = COALESCE(sla.`completed_at`, NOW()),
  sla.`updated_at` = NOW()
WHERE sla.`status` = 'ACTIVE';

DROP TEMPORARY TABLE `legacy_review_incidents_to_close`;

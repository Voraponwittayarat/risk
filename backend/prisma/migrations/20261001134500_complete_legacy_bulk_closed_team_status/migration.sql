-- Normalize the team-review marker for every incident closed by the legacy
-- backlog migration, including malformed historical rows without a team id.
UPDATE `riskregister` AS incident
INNER JOIN (
  SELECT DISTINCT CAST(`entity_id` AS UNSIGNED) AS `incident_id`
  FROM `workflow_audit`
  WHERE `entity_type` = 'INCIDENT'
    AND `action` = 'LEGACY_REVIEW_BULK_CLOSED'
) AS legacy_close
  ON legacy_close.`incident_id` = incident.`id`
SET
  incident.`team_review_status` = 'COMPLETED',
  incident.`team_review_completed_at` = COALESCE(incident.`team_review_completed_at`, incident.`operational_closed_at`, NOW()),
  incident.`modify_date` = NOW()
WHERE incident.`status_risk` = 'จำหน่าย'
  AND incident.`team_review_status` IN ('PENDING', 'IN_PROGRESS');

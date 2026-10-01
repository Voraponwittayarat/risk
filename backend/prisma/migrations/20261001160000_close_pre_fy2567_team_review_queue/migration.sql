-- Operator-authorized administrative closure: reports before FY2567
-- (2023-10-01), assigned to a lead team and still awaiting review.
-- Do not overwrite prior reviews or mark CAPA/RCA effectiveness as completed.
CREATE TEMPORARY TABLE `pre_fy2567_team_queue` (
  `id` INT NOT NULL,
  `id_risk` INT NOT NULL,
  PRIMARY KEY (`id`, `id_risk`)
);

INSERT INTO `pre_fy2567_team_queue` (`id`, `id_risk`)
SELECT `id`, `id_risk` FROM `riskregister`
WHERE `date_report` < '2023-10-01'
  AND `sendto_team_id` > 0
  AND `status_risk` = 'ตรวจสอบ';

INSERT INTO `riskreview` (
  `risk_id`, `riskregister_id`, `riskvisit`, `review_date`, `review_time`,
  `notereview`, `reviewresults_id`, `status_risk`, `discharge`,
  `created_by`, `updated_by`, `create_date`, `modify_date`
)
SELECT target.`id_risk`, target.`id`, CONCAT('S67', LPAD(target.`id`, 10, '0')),
  CURRENT_DATE(), CURRENT_TIME(),
  'ถูกจำหน่ายโดยระบบ เนื่องจากปรับเปลี่ยนระบบการทบทวนใหม่ 1/10/69',
  1, 'จำหน่าย', '1', NULL, NULL, NOW(), NOW()
FROM `pre_fy2567_team_queue` AS target
WHERE NOT EXISTS (
  SELECT 1 FROM `riskreview` AS review
  WHERE review.`riskregister_id` = target.`id`
    AND review.`riskvisit` = CONCAT('S67', LPAD(target.`id`, 10, '0'))
);

INSERT INTO `workflow_audit` (
  `entity_type`, `entity_id`, `action`, `old_value`, `new_value`,
  `reason`, `changed_by`, `changed_at`
)
SELECT 'INCIDENT', CAST(target.`id` AS CHAR), 'PRE_FY2567_TEAM_QUEUE_CLOSED',
  JSON_OBJECT('status_risk', incident.`status_risk`, 'team_review_status', incident.`team_review_status`, 'id_risk', incident.`id_risk`),
  JSON_OBJECT('status_risk', 'จำหน่าย', 'team_review_status', 'COMPLETED', 'cutoff', '2023-10-01'),
  'ถูกจำหน่ายโดยระบบ เนื่องจากปรับเปลี่ยนระบบการทบทวนใหม่ 1/10/69', NULL, NOW()
FROM `pre_fy2567_team_queue` AS target
JOIN `riskregister` AS incident ON incident.`id` = target.`id` AND incident.`id_risk` = target.`id_risk`
WHERE NOT EXISTS (
  SELECT 1 FROM `workflow_audit` AS audit
  WHERE audit.`entity_type` = 'INCIDENT' AND audit.`entity_id` = CAST(target.`id` AS CHAR)
    AND audit.`action` = 'PRE_FY2567_TEAM_QUEUE_CLOSED'
);

UPDATE `riskregister` AS incident
JOIN `pre_fy2567_team_queue` AS target ON incident.`id` = target.`id` AND incident.`id_risk` = target.`id_risk`
SET incident.`status_risk` = 'จำหน่าย',
    incident.`team_review_status` = 'COMPLETED',
    incident.`team_review_completed_at` = COALESCE(incident.`team_review_completed_at`, NOW()),
    incident.`operational_closed_at` = COALESCE(incident.`operational_closed_at`, NOW()),
    incident.`modify_date` = NOW()
WHERE incident.`status_risk` = 'ตรวจสอบ';

UPDATE `sla_instance` AS sla
JOIN `pre_fy2567_team_queue` AS target
  ON sla.`entity_type` = 'INCIDENT' AND sla.`entity_id` = CAST(target.`id` AS CHAR)
SET sla.`status` = 'COMPLETED', sla.`completed_at` = COALESCE(sla.`completed_at`, NOW()), sla.`updated_at` = NOW()
WHERE sla.`status` = 'ACTIVE';

DROP TEMPORARY TABLE `pre_fy2567_team_queue`;

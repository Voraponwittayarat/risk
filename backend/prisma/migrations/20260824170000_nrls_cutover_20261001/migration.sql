-- NRLS full-operation cutover: 1 October 2026 (1 October 2569 BE).
-- Historical incidents without an NRLS match remain unchanged except for the
-- explicit LEGACY status, which keeps them out of the mandatory quality queue.

INSERT INTO `incident_classification_audit` (
  `incident_id`, `id_risk`, `old_nrls_code`, `new_nrls_code`,
  `old_riskstore_id`, `new_riskstore_id`, `changed_by`, `reason`, `changed_at`
)
SELECT
  `id`, `id_risk`, `nrls_code`, NULL,
  `riskstore_id`, `riskstore_id`, NULL,
  'กำหนดเป็น LEGACY ตามนโยบายเริ่มใช้ NRLS เต็มรูปแบบ 1 ตุลาคม 2569', NOW()
FROM `riskregister`
WHERE `date_report` < '2026-10-01'
  AND (`nrls_code` IS NULL OR TRIM(`nrls_code`) = '')
  AND (`classification_status` IS NULL OR `classification_status` <> 'LEGACY');

UPDATE `riskregister`
SET `classification_status` = 'LEGACY',
    `classified_by` = NULL,
    `classified_at` = NULL,
    `modify_date` = NOW()
WHERE `date_report` < '2026-10-01'
  AND (`nrls_code` IS NULL OR TRIM(`nrls_code`) = '')
  AND (`classification_status` IS NULL OR `classification_status` <> 'LEGACY');

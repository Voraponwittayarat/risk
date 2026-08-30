-- Restore the data backup created before this migration before making riskstore_id NOT NULL.
DROP TABLE IF EXISTS `incident_classification_audit`;
ALTER TABLE `riskregister`
  DROP COLUMN `classified_at`,
  DROP COLUMN `classified_by`,
  DROP COLUMN `classification_status`,
  DROP COLUMN `nrls_name_snapshot`;
-- Only run after replacing every NULL riskstore_id with an explicitly reviewed local risk:
-- ALTER TABLE `riskregister` MODIFY `riskstore_id` INT NOT NULL;

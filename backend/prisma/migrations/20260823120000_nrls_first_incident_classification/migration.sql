-- NRLS-first incident classification (Phase 1-2)
-- Rollback guidance is documented in rollback.sql. Back up affected rows before applying.
ALTER TABLE `riskregister`
  MODIFY `riskstore_id` INT NULL,
  ADD COLUMN `nrls_name_snapshot` TEXT NULL AFTER `nrls_code`,
  ADD COLUMN `classification_status` VARCHAR(20) NULL AFTER `nrls_name_snapshot`,
  ADD COLUMN `classified_by` INT NULL AFTER `classification_status`,
  ADD COLUMN `classified_at` DATETIME NULL AFTER `classified_by`;

-- Legacy incidents remain unclassified; new records default to PENDING.
ALTER TABLE `riskregister` ALTER COLUMN `classification_status` SET DEFAULT 'PENDING';

CREATE TABLE `incident_classification_audit` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `incident_id` INT NOT NULL,
  `id_risk` INT NOT NULL,
  `old_nrls_code` VARCHAR(50) NULL,
  `new_nrls_code` VARCHAR(50) NULL,
  `old_riskstore_id` INT NULL,
  `new_riskstore_id` INT NULL,
  `changed_by` INT NULL,
  `reason` TEXT NULL,
  `changed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_classification_audit_incident` (`incident_id`, `id_risk`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

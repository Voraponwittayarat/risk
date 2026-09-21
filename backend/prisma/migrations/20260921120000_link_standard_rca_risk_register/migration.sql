ALTER TABLE `standard_rca_case`
  ADD COLUMN `risk_analysis_id` INTEGER NULL,
  ADD INDEX `idx_standard_rca_risk_analysis` (`risk_analysis_id`),
  ADD CONSTRAINT `fk_standard_rca_risk_analysis`
    FOREIGN KEY (`risk_analysis_id`) REFERENCES `riskanalysis` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `standard_rca_capa`
  ADD COLUMN `effectiveness_criteria` TEXT NULL,
  ADD COLUMN `baseline_value` VARCHAR(255) NULL,
  ADD COLUMN `target_value` VARCHAR(255) NULL,
  ADD COLUMN `effectiveness_due_date` DATE NULL;

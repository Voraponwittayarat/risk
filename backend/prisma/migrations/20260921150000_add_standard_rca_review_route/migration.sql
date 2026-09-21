ALTER TABLE `standard_rca_case`
  ADD COLUMN `review_outcome` VARCHAR(30) NULL DEFAULT 'IN_PROGRESS',
  ADD COLUMN `support_request_purpose` VARCHAR(30) NULL,
  ADD COLUMN `support_target_name` VARCHAR(255) NULL,
  ADD COLUMN `escalation_reason` TEXT NULL,
  ADD COLUMN `review_decided_by` INTEGER NULL,
  ADD COLUMN `review_decided_at` DATETIME(0) NULL;

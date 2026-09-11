ALTER TABLE `riskreview`
  ADD COLUMN `department_outcome` VARCHAR(30) NULL,
  ADD COLUMN `forwarding_purpose` VARCHAR(30) NULL,
  ADD COLUMN `forwarded_department_id` VARCHAR(10) NULL;

ALTER TABLE `incident_review_entry`
  ADD COLUMN `department_outcome` VARCHAR(30) NULL,
  ADD COLUMN `forwarding_purpose` VARCHAR(30) NULL,
  ADD COLUMN `forwarded_department_id` VARCHAR(10) NULL;

ALTER TABLE `riskregister`
  ADD COLUMN `department_review_outcome` VARCHAR(30) NULL,
  ADD COLUMN `review_forwarding_purpose` VARCHAR(30) NULL;

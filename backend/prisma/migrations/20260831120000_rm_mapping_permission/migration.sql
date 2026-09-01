ALTER TABLE `member`
  ADD COLUMN `mapping_permission` VARCHAR(20) NULL AFTER `rm_scope`;

UPDATE `member`
SET `mapping_permission` = 'full'
WHERE `role` = 'rm_committee'
  AND `mapping_permission` IS NULL;

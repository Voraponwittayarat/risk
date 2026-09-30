-- Additive only: existing RCA and monitoring history remain intact.
ALTER TABLE `standard_rca_case`
  ADD COLUMN `draft_register` LONGTEXT NULL,
  ADD COLUMN `version` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `standard_rca_capa` ADD COLUMN `client_key` VARCHAR(50) NULL;

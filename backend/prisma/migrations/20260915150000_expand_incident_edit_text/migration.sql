-- Immediate corrective actions are narrative text. The incident form already
-- accepts multi-line values, so VARCHAR(10) rejects normal reports with P2000.
ALTER TABLE `riskregister`
    MODIFY COLUMN `edit` TEXT NULL;

ALTER TABLE `risk`
    MODIFY COLUMN `edit` TEXT NULL;

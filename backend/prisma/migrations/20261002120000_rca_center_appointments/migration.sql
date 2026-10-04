ALTER TABLE `standard_rca_case` ADD COLUMN `hospital_center` BOOLEAN NOT NULL DEFAULT false;
UPDATE `standard_rca_case` SET `hospital_center` = true WHERE `rca_team` = 'รอศูนย์ RCA รับเรื่อง';
CREATE TABLE `standard_rca_appointment` (
 `id` VARCHAR(50) NOT NULL, `case_id` VARCHAR(50) NOT NULL,
 `starts_at` DATETIME(0) NOT NULL, `location` VARCHAR(255) NOT NULL,
 `participant_ids` TEXT NOT NULL, `participant_names` TEXT NOT NULL, `created_by` INTEGER NOT NULL,
 `notification_status` VARCHAR(20) NOT NULL DEFAULT 'NOT_SENT',
 `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (`id`), INDEX `standard_rca_appointment_case_id_starts_at_idx` (`case_id`, `starts_at`),
 CONSTRAINT `standard_rca_appointment_case_id_fkey` FOREIGN KEY (`case_id`) REFERENCES `standard_rca_case` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

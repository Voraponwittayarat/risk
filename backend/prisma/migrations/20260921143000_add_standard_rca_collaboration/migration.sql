CREATE TABLE `standard_rca_participant` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `standard_rca_case_id` VARCHAR(50) NOT NULL,
  `participant_type` VARCHAR(20) NOT NULL DEFAULT 'DEPARTMENT',
  `display_name` VARCHAR(255) NOT NULL,
  `role` VARCHAR(30) NOT NULL DEFAULT 'REVIEWER',
  `user_id` INTEGER NULL,
  `member_cid` VARCHAR(13) NULL,
  `department_id` VARCHAR(10) NULL,
  `team_id` INTEGER NULL,
  `purpose` TEXT NULL,
  `response_status` VARCHAR(30) NOT NULL DEFAULT 'NOT_REQUIRED',
  `responded_at` DATETIME(0) NULL,
  `is_owner` BOOLEAN NOT NULL DEFAULT false,
  `sort_order` INTEGER NULL DEFAULT 0,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_std_participant_case_role` (`standard_rca_case_id`, `role`, `response_status`),
  INDEX `idx_std_participant_target` (`user_id`, `department_id`, `team_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_standard_rca_participant_case`
    FOREIGN KEY (`standard_rca_case_id`) REFERENCES `standard_rca_case` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `standard_rca_voice_of_staff` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `standard_rca_case_id` VARCHAR(50) NOT NULL,
  `interviewee_name` VARCHAR(255) NULL,
  `interviewee_role` VARCHAR(100) NULL,
  `interviewee_department` VARCHAR(150) NULL,
  `interview_date` DATETIME(0) NULL,
  `work_context` TEXT NULL,
  `key_points` TEXT NOT NULL,
  `contributing_conditions` TEXT NULL,
  `suggestions` TEXT NULL,
  `sort_order` INTEGER NULL DEFAULT 0,
  `created_by` INTEGER NULL,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_std_voice_case_date` (`standard_rca_case_id`, `interview_date`),
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_standard_rca_voice_case`
    FOREIGN KEY (`standard_rca_case_id`) REFERENCES `standard_rca_case` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

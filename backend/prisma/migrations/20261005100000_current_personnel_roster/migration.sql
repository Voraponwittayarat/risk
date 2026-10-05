-- Separate current personnel snapshots from login accounts and historical clinical records.
CREATE TABLE `personnel_roster_batch` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `source_name` VARCHAR(255) NOT NULL,
  `as_of` DATE NOT NULL,
  `imported_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `imported_by` INTEGER NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `personnel_roster_entry` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `batch_id` INTEGER NOT NULL,
  `source_row` INTEGER NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `normalized_name` VARCHAR(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `position` VARCHAR(255) NOT NULL,
  `source_group` VARCHAR(255) NOT NULL,
  `source_unit` VARCHAR(255) NOT NULL,
  `employment` VARCHAR(255) NOT NULL,
  `department_id` INTEGER NOT NULL,
  `member_id` INTEGER NULL,
  UNIQUE INDEX `personnel_roster_batch_name` (`batch_id`, `normalized_name`),
  UNIQUE INDEX `personnel_roster_batch_row` (`batch_id`, `source_row`),
  UNIQUE INDEX `personnel_roster_batch_member` (`batch_id`, `member_id`),
  INDEX `personnel_roster_batch_department` (`batch_id`, `department_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `personnel_roster_entry_batch_fkey` FOREIGN KEY (`batch_id`) REFERENCES `personnel_roster_batch` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

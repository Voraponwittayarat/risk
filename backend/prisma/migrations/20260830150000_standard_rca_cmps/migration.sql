-- Persist the quick stakeholder-review Care Management Problems (CMPs)
-- entered in Standard RCA section 4.
SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION';

CREATE TABLE standard_rca_cmp (
  id INT NOT NULL AUTO_INCREMENT,
  standard_rca_case_id VARCHAR(50) NOT NULL,
  observation TEXT NULL,
  hypothesis TEXT NULL,
  comment TEXT NULL,
  sort_order INT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_std_cmp_case_id (standard_rca_case_id),
  CONSTRAINT fk_std_cmp_case
    FOREIGN KEY (standard_rca_case_id) REFERENCES standard_rca_case(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

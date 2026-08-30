-- Link every newly confirmed Trigger Tool review to exactly one incident report.
-- Existing review rows remain PENDING and are not backfilled because historical
-- rows do not contain a reliably confirmed NRLS classification.
SET SESSION sql_mode = 'NO_ENGINE_SUBSTITUTION';

ALTER TABLE medical_record_review
  ADD COLUMN risk_confirmation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN risk_confirmed_at DATETIME NULL,
  ADD COLUMN risk_confirmed_by INT NULL,
  ADD COLUMN riskregister_id INT NULL,
  ADD COLUMN riskregister_id_risk INT NULL,
  ADD COLUMN nrls_code VARCHAR(50) NULL,
  ADD COLUMN nrls_name_snapshot TEXT NULL,
  ADD COLUMN riskstore_id INT NULL,
  ADD UNIQUE KEY uq_trigger_review_incident (riskregister_id, riskregister_id_risk),
  ADD KEY idx_trigger_review_confirmation (risk_confirmation_status, review_date);

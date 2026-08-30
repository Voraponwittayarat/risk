ALTER TABLE riskregister
  DROP INDEX idx_incident_team_review,
  DROP COLUMN team_reviewed_by,
  DROP COLUMN team_review_completed_at,
  DROP COLUMN team_review_started_at,
  DROP COLUMN team_review_status;

-- Keep modify_date nullable with a valid default. Restoring a zero-date default
-- would make later ALTER statements fail under strict SQL modes.

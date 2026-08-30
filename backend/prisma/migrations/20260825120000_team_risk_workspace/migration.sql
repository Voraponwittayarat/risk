-- Team review is a secondary workflow. It must not overwrite the department's
-- main incident lifecycle status in riskregister.status_risk.
-- MariaDB 5.5 can reject any ALTER on this legacy table while modify_date keeps
-- its zero-date default, so normalize that nullable timestamp first.
ALTER TABLE riskregister
  MODIFY COLUMN modify_date TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE riskregister
  ADD COLUMN team_review_status VARCHAR(20) NULL AFTER sendto_member_cid,
  ADD COLUMN team_review_started_at DATETIME NULL AFTER team_review_status,
  ADD COLUMN team_review_completed_at DATETIME NULL AFTER team_review_started_at,
  ADD COLUMN team_reviewed_by INT NULL AFTER team_review_completed_at,
  ADD INDEX idx_incident_team_review (sendto_team_id, team_review_status, date_report);

-- Existing assignments that already reached department review enter the new
-- workspace as pending work. Earlier lifecycle states remain hidden until the
-- department records its review.
UPDATE riskregister
SET team_review_status = 'PENDING'
WHERE sendto_team_id IS NOT NULL
  AND status_risk IN ('ทบทวน', 'จำหน่าย')
  AND team_review_status IS NULL;

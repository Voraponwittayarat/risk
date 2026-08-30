UPDATE riskregister
SET team_review_status = 'PENDING',
    team_review_completed_at = NULL
WHERE sendto_team_id IS NOT NULL
  AND status_risk = 'จำหน่าย'
  AND team_review_status = 'COMPLETED';

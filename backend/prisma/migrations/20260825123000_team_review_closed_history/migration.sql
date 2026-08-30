-- Closed legacy incidents are historical evidence, not pending team work.
UPDATE riskregister
SET team_review_status = 'COMPLETED',
    team_review_completed_at = COALESCE(team_review_completed_at, modify_date, send_date, NOW())
WHERE sendto_team_id IS NOT NULL
  AND status_risk = 'จำหน่าย'
  AND (team_review_status IS NULL OR team_review_status = 'PENDING');

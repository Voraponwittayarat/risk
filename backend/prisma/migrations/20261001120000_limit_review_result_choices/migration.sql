-- Preserve review result rows 3-5 for existing audit history. New reviews
-- expose only rows 1-2 through the API.
UPDATE `reviewresults`
SET `reviewresults_name` = CASE `id`
  WHEN 1 THEN 'ทบทวนแล้ว ยังไม่เกิดมาตรการใหม่'
  WHEN 2 THEN 'มีมาตรการหรือระบบใหม่'
  ELSE `reviewresults_name`
END,
`modify_date` = CURRENT_TIMESTAMP
WHERE `id` IN (1, 2);

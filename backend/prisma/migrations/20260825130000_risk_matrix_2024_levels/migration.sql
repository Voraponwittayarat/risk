-- Align persisted Risk Analysis colours with RiskMatrix5x5_2024.
-- The numeric score remains L x C; the colour follows the matrix coordinate.
UPDATE riskanalysis
SET initial_risk_level = CASE
  WHEN initial_consequence = 5 THEN 'red'
  WHEN initial_consequence = 4 THEN CASE WHEN initial_likelihood <= 2 THEN 'orange' ELSE 'red' END
  WHEN initial_consequence = 3 THEN CASE WHEN initial_likelihood <= 2 THEN 'yellow' WHEN initial_likelihood = 3 THEN 'orange' ELSE 'red' END
  WHEN initial_consequence = 2 THEN CASE WHEN initial_likelihood = 1 THEN 'green' WHEN initial_likelihood <= 3 THEN 'yellow' ELSE 'orange' END
  ELSE CASE WHEN initial_likelihood <= 3 THEN 'green' ELSE 'yellow' END
END
WHERE initial_likelihood BETWEEN 1 AND 5
  AND initial_consequence BETWEEN 1 AND 5;

UPDATE riskanalysis_review
SET current_risk_level = CASE
  WHEN current_consequence = 5 THEN 'red'
  WHEN current_consequence = 4 THEN CASE WHEN current_likelihood <= 2 THEN 'orange' ELSE 'red' END
  WHEN current_consequence = 3 THEN CASE WHEN current_likelihood <= 2 THEN 'yellow' WHEN current_likelihood = 3 THEN 'orange' ELSE 'red' END
  WHEN current_consequence = 2 THEN CASE WHEN current_likelihood = 1 THEN 'green' WHEN current_likelihood <= 3 THEN 'yellow' ELSE 'orange' END
  ELSE CASE WHEN current_likelihood <= 3 THEN 'green' ELSE 'yellow' END
END
WHERE current_likelihood BETWEEN 1 AND 5
  AND current_consequence BETWEEN 1 AND 5;


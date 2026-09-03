UPDATE "Issue"
SET "category" = CASE "category"
  WHEN 'Bug' THEN 'bug'
  WHEN 'Infra' THEN 'infra'
  WHEN 'Performance' THEN 'performance'
  WHEN 'Script' THEN 'script'
  WHEN 'Other' THEN 'other'
  ELSE "category"
END
WHERE "category" IN ('Bug', 'Infra', 'Performance', 'Script', 'Other');

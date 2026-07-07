-- Read-only audit for task/time-entry consistency.
-- Expected healthy result:
-- - mismatched_tasks = 0
-- - orphan_entries = 0
-- - member_mismatch_entries = 0

WITH task_minutes AS (
  SELECT
    t.organization_id,
    t.assignee_member_id,
    t.id,
    t.title,
    COALESCE(t.actual_minutes, 0) AS actual_minutes,
    COALESCE(SUM(te.minutes), 0) AS entry_minutes,
    COUNT(te.id) AS entry_count
  FROM tasks t
  LEFT JOIN time_entries te
    ON te.organization_id = t.organization_id
   AND te.task_id = t.id
  WHERE COALESCE(t.assignment_status, 'accepted') = 'accepted'
  GROUP BY t.organization_id, t.assignee_member_id, t.id, t.title, t.actual_minutes
)
SELECT
  COUNT(*) AS mismatched_tasks,
  SUM(CASE WHEN entry_count = 0 AND actual_minutes > 0 THEN 1 ELSE 0 END) AS actual_without_entries,
  SUM(CASE WHEN entry_count > 0 AND actual_minutes <> entry_minutes THEN 1 ELSE 0 END) AS actual_differs_entries
FROM task_minutes
WHERE actual_minutes <> entry_minutes;

SELECT
  t.organization_id,
  t.assignee_member_id,
  t.id,
  t.title,
  COALESCE(t.actual_minutes, 0) AS actual_minutes,
  COALESCE(SUM(te.minutes), 0) AS entry_minutes,
  COUNT(te.id) AS entry_count
FROM tasks t
LEFT JOIN time_entries te
  ON te.organization_id = t.organization_id
 AND te.task_id = t.id
WHERE COALESCE(t.assignment_status, 'accepted') = 'accepted'
GROUP BY t.organization_id, t.assignee_member_id, t.id, t.title, t.actual_minutes
HAVING actual_minutes <> entry_minutes
ORDER BY t.organization_id, t.assignee_member_id, t.id;

SELECT COUNT(*) AS orphan_entries
FROM time_entries te
LEFT JOIN tasks t
  ON t.organization_id = te.organization_id
 AND t.id = te.task_id
WHERE te.task_id IS NOT NULL
  AND te.task_id <> ''
  AND t.id IS NULL;

SELECT COUNT(*) AS member_mismatch_entries
FROM time_entries te
JOIN tasks t
  ON t.organization_id = te.organization_id
 AND t.id = te.task_id
WHERE t.assignee_member_id IS NOT NULL
  AND te.member_id <> t.assignee_member_id;

-- Axel operational report cards are completed work evidence.
-- The linked project remains active/non-complete, but each reported task belongs in Done.

WITH axel_report_tasks AS (
  SELECT
    t.id,
    t.project_id
  FROM tasks t
  LEFT JOIN members m ON m.id = t.assignee_member_id
  WHERE t.organization_id = 'org_demo_righello'
    AND lower(coalesce(m.email, '')) = 'axel@wearerighello.com'
    AND (
      t.id LIKE 'task_import_%'
      OR t.id LIKE 'task_axel_profile_%'
      OR t.id LIKE 'task_axel_ext%'
      OR coalesce(t.tags_json, '') LIKE '%github-real%'
      OR coalesce(t.tags_json, '') LIKE '%cto-profile%'
    )
)
UPDATE tasks
SET
  status = 'done',
  column_id = 'done',
  updated_at = CURRENT_TIMESTAMP
WHERE id IN (SELECT id FROM axel_report_tasks);

WITH linked_projects AS (
  SELECT DISTINCT t.project_id
  FROM tasks t
  LEFT JOIN members m ON m.id = t.assignee_member_id
  WHERE t.organization_id = 'org_demo_righello'
    AND lower(coalesce(m.email, '')) = 'axel@wearerighello.com'
    AND t.project_id IS NOT NULL
    AND (
      t.id LIKE 'task_import_%'
      OR t.id LIKE 'task_axel_profile_%'
      OR t.id LIKE 'task_axel_ext%'
      OR coalesce(t.tags_json, '') LIKE '%github-real%'
      OR coalesce(t.tags_json, '') LIKE '%cto-profile%'
    )
)
UPDATE projects
SET
  status = CASE WHEN status IN ('archived', 'completed') THEN status ELSE 'active' END,
  updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND id IN (SELECT project_id FROM linked_projects);

-- Axel operational report cards are macro tasks.
-- Default them to in-progress unless the project is explicitly released, closed, or terminated.

WITH axel_macro_tasks AS (
  SELECT
    t.id,
    lower(coalesce(t.title, '') || ' ' || coalesce(t.description, '')) AS search_text
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
    AND coalesce(t.column_id, t.status) IN ('done', 'completed', 'validation')
)
UPDATE tasks
SET
  status = 'in-progress',
  column_id = 'in-progress',
  updated_at = CURRENT_TIMESTAMP
WHERE id IN (
  SELECT id
  FROM axel_macro_tasks
  WHERE search_text NOT LIKE '%ufficialmente in production%'
    AND search_text NOT LIKE '%ufficialmente in produzione%'
    AND search_text NOT LIKE '%messo in production%'
    AND search_text NOT LIKE '%messo in produzione%'
    AND search_text NOT LIKE '%rilasciato in production%'
    AND search_text NOT LIKE '%rilasciata in production%'
    AND search_text NOT LIKE '%rilasciato in produzione%'
    AND search_text NOT LIKE '%rilasciata in produzione%'
    AND search_text NOT LIKE '%deployato in produzione%'
    AND search_text NOT LIKE '%deployata in produzione%'
    AND search_text NOT LIKE '%pubblicato%'
    AND search_text NOT LIKE '%pubblicata%'
    AND search_text NOT LIKE '%go-live%'
    AND search_text NOT LIKE '%go live%'
    AND search_text NOT LIKE '%terminato%'
    AND search_text NOT LIKE '%terminata%'
    AND search_text NOT LIKE '%chiuso%'
    AND search_text NOT LIKE '%chiusa%'
);

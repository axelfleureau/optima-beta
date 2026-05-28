-- Tetha is a Righello product, not an external/client company.
-- Keep the Tetha project as an internal product under Righello operations.

PRAGMA foreign_keys = ON;

UPDATE projects
SET client_id = 'client_internal_righello_ops',
    updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND id = 'project_internal_tetha';

UPDATE tasks
SET client_id = 'client_internal_righello_ops',
    client_name = 'Righello',
    tags_json = CASE
      WHEN tags_json LIKE '%righello-product%' THEN tags_json
      WHEN json_valid(tags_json) THEN json_insert(tags_json, '$[#]', 'righello-product')
      ELSE '["github-real","tetha","righello-product"]'
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND project_id = 'project_internal_tetha';

UPDATE clients
SET status = 'archived',
    updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND id = 'client_internal_tetha';

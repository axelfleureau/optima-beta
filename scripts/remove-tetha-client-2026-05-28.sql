-- Tetha is a Righello product, not a client workspace.
-- This cleanup removes the old standalone client row after all references
-- have been moved to the internal Righello operations client.

PRAGMA foreign_keys = ON;

UPDATE projects
SET client_id = 'client_internal_righello_ops',
    updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND client_id = 'client_internal_tetha';

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
  AND (client_id = 'client_internal_tetha' OR client_name = 'Tetha');

UPDATE campaigns
SET client_id = 'client_internal_righello_ops',
    updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND client_id = 'client_internal_tetha';

UPDATE quotes
SET client_id = 'client_internal_righello_ops',
    client_name = 'Righello',
    updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND (client_id = 'client_internal_tetha' OR client_name = 'Tetha');

UPDATE team_calendar_events
SET client_id = 'client_internal_righello_ops',
    updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND client_id = 'client_internal_tetha';

DELETE FROM clients
WHERE organization_id = 'org_demo_righello'
  AND id = 'client_internal_tetha';

-- Righello Live Studio is an internal Righello product/platform, not a client.
-- It originated from the OBS Padel Stream Overlay repository, but the product
-- is not limited to padel and should live under the Righello workspace.

PRAGMA foreign_keys = ON;

INSERT INTO clients (id, organization_id, name, email, company, status, created_at, updated_at)
VALUES ('client_internal_righello_ops', 'org_demo_righello', 'Righello', NULL, 'Righello', 'active', '2026-05-22T08:00:00.000Z', CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  name = 'Righello',
  company = 'Righello',
  status = 'active',
  updated_at = CURRENT_TIMESTAMP;

UPDATE projects
SET client_id = 'client_internal_righello_ops',
    name = 'Righello Live Studio',
    updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND (
    id = 'project_internal_obs_padel_stream_overlay'
    OR name = 'OBS Padel Stream Overlay'
  );

UPDATE tasks
SET client_id = 'client_internal_righello_ops',
    client_name = 'Righello',
    title = REPLACE(title, 'OBS Padel', 'Righello Live Studio'),
    description = REPLACE(description, 'OBS Padel', 'Righello Live Studio'),
    rich_description = REPLACE(rich_description, 'OBS Padel', 'Righello Live Studio'),
    tags_json = CASE
      WHEN tags_json LIKE '%righello-product%' THEN tags_json
      WHEN json_valid(tags_json) THEN json_insert(tags_json, '$[#]', 'righello-product')
      ELSE '["github-real","righello-live-studio","righello-product"]'
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND (
    project_id = 'project_internal_obs_padel_stream_overlay'
    OR client_id = 'client_internal_obs_padel'
    OR client_name = 'OBS Padel Stream Overlay'
  );

UPDATE time_entries
SET project_id = 'project_internal_obs_padel_stream_overlay',
    updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND project_id = 'project_internal_obs_padel_stream_overlay';

UPDATE team_calendar_events
SET client_id = 'client_internal_righello_ops',
    updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND client_id = 'client_internal_obs_padel';

DELETE FROM clients
WHERE organization_id = 'org_demo_righello'
  AND id = 'client_internal_obs_padel';

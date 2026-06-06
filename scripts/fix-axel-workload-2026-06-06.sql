-- Correct Axel 2026-06-06 workload.
-- Sources:
-- - existing local Codex recovery task/time entries;
-- - verified optima-beta GitHub commits on codex/pause-vps-runner;
-- - existing imported Revolut supervised recovery task.

UPDATE tasks
SET
  estimated_minutes = 240,
  actual_minutes = 240,
  tags_json = REPLACE(tags_json, '"needs-duration"', '"duration-github-consuntivo"'),
  updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND id = 'task_axel_github_20260606_optima_beta_pause_vps_runner';

UPDATE tasks
SET
  estimated_minutes = 120,
  actual_minutes = 120,
  tags_json = REPLACE(tags_json, '"needs-duration"', '"duration-github-consuntivo"'),
  updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND id = 'task_axel_github_20260606_revolut_supervised_recovery_api';

INSERT INTO tasks (
  id, organization_id, project_id, assignee_member_id, title, description,
  status, priority, estimated_minutes, actual_minutes, due_at, created_at, updated_at,
  column_id, client_id, client_name, type, score, rich_description,
  assignee_name, tags_json, attachments_json, comments_json, sub_items_json,
  created_by_member_id, assignment_status, assignment_requested_by_member_id,
  assignment_requested_at, assignment_responded_at
)
VALUES
  (
    'task_axel_20260606_optima_graph_memory_mcp',
    'org_demo_righello',
    'project_internal_optima',
    'mem_axel_wearerighello',
    '2026-06-06 - Optima graph memory MCP Hermes Graphify',
    'Implementato il primo layer reale di graph memory agentica multi-tenant: schema D1 nodi/archi/sessioni, libreria, API, tool MCP, risorsa MCP, UI stack agenti e documentazione Hermes/Graphify/Perplexity-pattern.',
    'done',
    'urgent',
    180,
    180,
    '2026-06-06T11:30:00.000Z',
    '2026-06-06T09:30:00.000Z',
    '2026-06-06T11:30:00.000Z',
    'done',
    'client_internal_righello_ops',
    'Righello',
    'AI operations / MCP graph memory',
    10,
    'Aggiunto layer Optima Agentic OS con graph memory tenant-scoped, sorgenti Hermes Agent e Graphify come reference-only, API /api/agentic-graph, tool MCP optima_graph_memory_snapshot/search/upsert, risorsa optima://agentic/graph-memory e pannello UI nella control room agenti. Build, migration D1, deploy Cloudflare e sync VPS eseguiti.',
    'Axel Fleureau',
    '["github-real","2026-06-06","duration-github-consuntivo","optima-beta","agentic-os","graph-memory","mcp","hermes","graphify","perplexity-pattern","cloudflare-deploy","vps-sync"]',
    '[]',
    '[]',
    '[]',
    'mem_axel_wearerighello',
    'accepted',
    'mem_axel_wearerighello',
    '2026-06-06T09:30:00.000Z',
    '2026-06-06T11:30:00.000Z'
  ),
  (
    'task_axel_20260606_optima_presence_workload_repair',
    'org_demo_righello',
    'project_internal_optima',
    'mem_axel_wearerighello',
    '2026-06-06 - Optima heatmap workload e consuntivi Axel',
    'Corretto il modello dati della heatmap presenze per distinguere task senza durata da lavoro leggero, riparati consuntivi Axel 5/6 giugno, chiarito tooltip e script idempotenti.',
    'done',
    'urgent',
    120,
    120,
    '2026-06-06T11:45:00.000Z',
    '2026-06-06T10:45:00.000Z',
    '2026-06-06T11:45:00.000Z',
    'done',
    'client_internal_righello_ops',
    'Righello',
    'Presence / Data repair',
    10,
    'Correzione dati e UX presenze: il warning giallo indica durate mancanti, non carico leggero. Aggiornati task GitHub Axel con durata, create time entry idempotenti, deploy Cloudflare e sync VPS. Aggiunto script per recupero notturno Codex e verifica D1 production.',
    'Axel Fleureau',
    '["github-real","2026-06-06","duration-github-consuntivo","optima-beta","presence-heatmap","time-tracking","data-repair","github-workload","cloudflare-deploy","vps-sync"]',
    '[]',
    '[]',
    '[]',
    'mem_axel_wearerighello',
    'accepted',
    'mem_axel_wearerighello',
    '2026-06-06T10:45:00.000Z',
    '2026-06-06T11:45:00.000Z'
  )
ON CONFLICT(id) DO UPDATE SET
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  priority = excluded.priority,
  estimated_minutes = excluded.estimated_minutes,
  actual_minutes = excluded.actual_minutes,
  due_at = excluded.due_at,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at,
  column_id = excluded.column_id,
  client_id = excluded.client_id,
  client_name = excluded.client_name,
  type = excluded.type,
  score = excluded.score,
  rich_description = excluded.rich_description,
  assignee_name = excluded.assignee_name,
  tags_json = excluded.tags_json,
  assignment_status = excluded.assignment_status,
  assignment_requested_at = excluded.assignment_requested_at,
  assignment_responded_at = excluded.assignment_responded_at;

INSERT INTO time_entries (
  id, organization_id, member_id, task_id, project_id, client_id,
  entry_date, minutes, billable, note, created_at, updated_at
)
VALUES
  (
    'time_axel_20260606_optima_agentic_os_pr',
    'org_demo_righello',
    'mem_axel_wearerighello',
    'task_axel_github_20260606_optima_beta_pause_vps_runner',
    'project_internal_optima',
    'client_internal_righello_ops',
    '2026-06-06',
    240,
    1,
    'Optima PR #1 agentic operating layer: MCP/OAuth, Telegram, Hostinger runner, review room e mobile control room.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'time_axel_20260606_revolut_supervised_recovery',
    'org_demo_righello',
    'mem_axel_wearerighello',
    'task_axel_github_20260606_revolut_supervised_recovery_api',
    'project_internal_revolut_crypto_scalper',
    'client_internal_righello_ops',
    '2026-06-06',
    120,
    1,
    'Revolut supervised recovery: supervisor deterministico, auto-resume, bot control API e test.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'time_axel_20260606_optima_graph_memory_mcp',
    'org_demo_righello',
    'mem_axel_wearerighello',
    'task_axel_20260606_optima_graph_memory_mcp',
    'project_internal_optima',
    'client_internal_righello_ops',
    '2026-06-06',
    180,
    1,
    'Optima graph memory MCP: Hermes/Graphify reference, D1 graph schema, API, MCP tools, UI stack, deploy e VPS sync.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'time_axel_20260606_optima_presence_workload_repair',
    'org_demo_righello',
    'mem_axel_wearerighello',
    'task_axel_20260606_optima_presence_workload_repair',
    'project_internal_optima',
    'client_internal_righello_ops',
    '2026-06-06',
    120,
    1,
    'Optima heatmap workload e consuntivi: corretti task senza durata, tooltip e dati Axel 5/6 giugno.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT(id) DO UPDATE SET
  minutes = excluded.minutes,
  note = excluded.note,
  updated_at = CURRENT_TIMESTAMP;

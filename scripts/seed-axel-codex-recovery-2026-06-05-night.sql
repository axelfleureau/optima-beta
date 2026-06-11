-- Idempotent local Codex recovery work for Axel Fleureau.
-- Period: 2026-06-05 22:00 to 2026-06-06 03:00 Europe/Rome.
-- Source: local Codex operational recovery, not GitHub activity.

INSERT INTO tasks (
  id, organization_id, project_id, assignee_member_id, title, description,
  status, priority, estimated_minutes, actual_minutes, due_at, created_at, updated_at,
  column_id, client_id, client_name, type, score, rich_description,
  assignee_name, tags_json, attachments_json, comments_json, sub_items_json,
  created_by_member_id, assignment_status, assignment_requested_by_member_id,
  assignment_requested_at, assignment_responded_at
)
VALUES (
  'task_axel_20260605_codex_recovery_continuity',
  'org_demo_righello',
  'project_internal_optima',
  'mem_axel_wearerighello',
  '2026-06-05 notte - Ripristino ambiente Codex e continuita progetti',
  'Gestita una criticita notturna su Codex che rendeva non visibili o inutilizzabili diverse chat progetto. Recuperati thread, contesti e sessioni operative tramite audit dei database locali e dei file sessione. Compattate conversazioni sovradimensionate, creati dossier di recupero e riallineata la sidebar con i thread attivi.',
  'done',
  'urgent',
  300,
  300,
  '2026-06-06T01:00:00.000Z',
  '2026-06-05T20:00:00.000Z',
  '2026-06-06T01:00:00.000Z',
  'done',
  'client_internal_righello_ops',
  'Righello',
  'Operations / Codex recovery',
  10,
  'Audit e ripristino dello stato locale di Codex dopo crash critico dell app. Recupero di chat progetto vuote, non visibili o non utilizzabili. Analisi di database locali, indici sidebar e file sessione JSONL. Identificazione di sessioni sovradimensionate che causavano context_length_exceeded, array too long e chat non renderizzabili. Backup completo delle sessioni originali prima degli interventi. Compattazione conservativa delle chat progetto a rischio preservando il contesto operativo in dossier di recupero. Ripristino e creazione thread operativi per Optima, Revolut Bot e OBS-Live. Ricostruzione indice sidebar e riallineamento thread attivi/pinned. Verifica finale di integrita su database, file sessione, chat attive e riferimenti progetto. Pulizia metadati e titoli lunghi/corrotti. Validazione delle chat create da mobile nel database locale Mac. Produzione di report e dossier di recupero per continuita operativa.',
  'Axel Fleureau',
  '["codex-local-recovery","2026-06-05","2026-06-06","duration-consuntivo","optima","revolut-bot","obs-live","database-audit","jsonl-sessions","sidebar-index","context-compaction","project-continuity"]',
  '[]',
  '[]',
  '[]',
  'mem_axel_wearerighello',
  'accepted',
  'mem_axel_wearerighello',
  '2026-06-05T20:00:00.000Z',
  '2026-06-06T01:00:00.000Z'
)
ON CONFLICT(id) DO UPDATE SET
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  priority = excluded.priority,
  estimated_minutes = excluded.estimated_minutes,
  actual_minutes = excluded.actual_minutes,
  due_at = excluded.due_at,
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
    'time_axel_20260605_codex_recovery_2200_2400',
    'org_demo_righello',
    'mem_axel_wearerighello',
    'task_axel_20260605_codex_recovery_continuity',
    'project_internal_optima',
    'client_internal_righello_ops',
    '2026-06-05',
    120,
    1,
    'Ripristino ambiente Codex e continuita progetti: 22:00-24:00 Europe/Rome.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'time_axel_20260606_codex_recovery_0000_0300',
    'org_demo_righello',
    'mem_axel_wearerighello',
    'task_axel_20260605_codex_recovery_continuity',
    'project_internal_optima',
    'client_internal_righello_ops',
    '2026-06-06',
    180,
    1,
    'Ripristino ambiente Codex e continuita progetti: 00:00-03:00 Europe/Rome.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT(id) DO UPDATE SET
  minutes = excluded.minutes,
  note = excluded.note,
  updated_at = CURRENT_TIMESTAMP;

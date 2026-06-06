-- Correct Axel workload totals for 2026-06-04 and 2026-06-06.
--
-- Rationale:
-- - 2026-06-06 is the current day in the source conversation. It cannot be
--   displayed as a closed 14h day at 14:49, so the daytime blocks are capped
--   while preserving the verified 00:00-03:00 Codex recovery work.
-- - 2026-06-04 still had two GitHub-backed done tasks with missing duration,
--   causing the yellow "to be reviewed" signal in the heatmap.

UPDATE tasks
SET
  estimated_minutes = 120,
  actual_minutes = 120,
  tags_json = REPLACE(tags_json, '"needs-duration"', '"duration-github-consuntivo"'),
  rich_description = CASE
    WHEN instr(COALESCE(rich_description, ''), 'consuntivo cap giornaliero applicato') > 0 THEN rich_description
    ELSE COALESCE(rich_description, '') || ' Durata corretta il 2026-06-06: consuntivo cap giornaliero applicato per evitare overcount prima della chiusura giornata.'
  END,
  updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND id = 'task_axel_github_20260606_optima_beta_pause_vps_runner';

UPDATE tasks
SET
  estimated_minutes = 60,
  actual_minutes = 60,
  tags_json = REPLACE(tags_json, '"needs-duration"', '"duration-github-consuntivo"'),
  rich_description = CASE
    WHEN instr(COALESCE(rich_description, ''), 'consuntivo cap giornaliero applicato') > 0 THEN rich_description
    ELSE COALESCE(rich_description, '') || ' Durata corretta il 2026-06-06: consuntivo cap giornaliero applicato per evitare overcount prima della chiusura giornata.'
  END,
  updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND id = 'task_axel_github_20260606_revolut_supervised_recovery_api';

UPDATE tasks
SET
  estimated_minutes = 110,
  actual_minutes = 110,
  rich_description = CASE
    WHEN instr(COALESCE(rich_description, ''), 'consuntivo cap giornaliero applicato') > 0 THEN rich_description
    ELSE COALESCE(rich_description, '') || ' Durata corretta il 2026-06-06: consuntivo cap giornaliero applicato per evitare overcount prima della chiusura giornata.'
  END,
  updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND id = 'task_axel_20260606_optima_graph_memory_mcp';

UPDATE tasks
SET
  estimated_minutes = 60,
  actual_minutes = 60,
  rich_description = CASE
    WHEN instr(COALESCE(rich_description, ''), 'consuntivo cap giornaliero applicato') > 0 THEN rich_description
    ELSE COALESCE(rich_description, '') || ' Durata corretta il 2026-06-06: consuntivo cap giornaliero applicato per evitare overcount prima della chiusura giornata.'
  END,
  updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND id = 'task_axel_20260606_optima_presence_workload_repair';

UPDATE time_entries
SET
  minutes = 120,
  note = 'Optima PR #1 agentic operating layer: MCP/OAuth, Telegram, Hostinger runner, review room e mobile control room. Durata cap corrente applicata.',
  updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND id = 'time_axel_20260606_optima_agentic_os_pr';

UPDATE time_entries
SET
  minutes = 60,
  note = 'Revolut supervised recovery: supervisor deterministico, auto-resume, bot control API e test. Durata cap corrente applicata.',
  updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND id = 'time_axel_20260606_revolut_supervised_recovery';

UPDATE time_entries
SET
  minutes = 110,
  note = 'Optima graph memory MCP: Hermes/Graphify reference, D1 graph schema, API, MCP tools, UI stack, deploy e VPS sync. Durata cap corrente applicata.',
  updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND id = 'time_axel_20260606_optima_graph_memory_mcp';

UPDATE time_entries
SET
  minutes = 60,
  note = 'Optima heatmap workload e consuntivi: corretti task senza durata, tooltip e dati Axel. Durata cap corrente applicata.',
  updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND id = 'time_axel_20260606_optima_presence_workload_repair';

UPDATE tasks
SET
  estimated_minutes = 45,
  actual_minutes = 45,
  tags_json = REPLACE(tags_json, '"needs-duration"', '"duration-github-consuntivo"'),
  rich_description = 'Attivita GitHub verificata su axelfleureau/Portopiccolo. Aree: DNS/networking, email, migrazione dominio e operations. Periodo: sera 4 giugno 2026. Durata consuntivata da attivita operativa reale: 45 minuti.',
  updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND id = 'task_axel_github_20260604_portopiccolo_contacts_mail_backup';

UPDATE tasks
SET
  estimated_minutes = 60,
  actual_minutes = 60,
  tags_json = REPLACE(tags_json, '"needs-duration"', '"duration-github-consuntivo"'),
  rich_description = 'Attivita GitHub verificata su axelfleureau/revolut-crypto-scalper. Aree: backend, automazione trading, risk management e bugfix. Periodo: sera 4 giugno 2026. Durata consuntivata da attivita operativa reale: 60 minuti.',
  updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND id = 'task_axel_github_20260604_revolut_kill_switch_derisk_guard';

INSERT INTO time_entries (
  id, organization_id, member_id, task_id, project_id, client_id,
  entry_date, minutes, billable, note, created_at, updated_at
)
VALUES
  (
    'time_axel_20260604_portopiccolo_contacts_mail_backup',
    'org_demo_righello',
    'mem_axel_wearerighello',
    'task_axel_github_20260604_portopiccolo_contacts_mail_backup',
    'project_internal_portopiccolo',
    'client_rig_ppap',
    '2026-06-04',
    45,
    1,
    'Portopiccolo: export contatti mail/webmail e controllo backup contatti.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'time_axel_20260604_revolut_kill_switch_derisk_guard',
    'org_demo_righello',
    'mem_axel_wearerighello',
    'task_axel_github_20260604_revolut_kill_switch_derisk_guard',
    'project_internal_revolut_crypto_scalper',
    'client_internal_righello_ops',
    '2026-06-04',
    60,
    1,
    'Revolut crypto scalper: rafforzamento kill switch e blocco vendite routinarie di derisk.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT(id) DO UPDATE SET
  minutes = excluded.minutes,
  note = excluded.note,
  updated_at = CURRENT_TIMESTAMP;

-- Normalize Axel historical presence/task consistency.
-- Goal: task actual_minutes must match the sum of linked time_entries,
-- while duplicate workspace-completion entries must not inflate day workload.

DELETE FROM time_entries
WHERE organization_id = 'org_demo_righello'
  AND member_id = 'mem_axel_wearerighello'
  AND id IN (
    'time_52aa411082694503a1553fec2f9c0990',
    'time_63f0e02a1d0c47f4927844dc13cdd176'
  );

INSERT INTO time_entries (
  id, organization_id, member_id, task_id, project_id, client_id,
  entry_date, minutes, billable, note, created_at, updated_at
)
SELECT
  'time_axel_20260605_optima_beta_runner_stability_normalized',
  organization_id,
  assignee_member_id,
  id,
  project_id,
  client_id,
  '2026-06-05',
  150,
  1,
  'Consuntivo operativo da attivita GitHub verificata: Optima runner agentico, rapportini e PR operating layer.',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM tasks
WHERE organization_id = 'org_demo_righello'
  AND assignee_member_id = 'mem_axel_wearerighello'
  AND id = 'task_axel_github_20260604_20260605_optima_beta_runner_stability'
ON CONFLICT(id) DO UPDATE SET
  task_id = excluded.task_id,
  project_id = excluded.project_id,
  client_id = excluded.client_id,
  entry_date = excluded.entry_date,
  minutes = excluded.minutes,
  billable = excluded.billable,
  note = excluded.note,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO time_entries (
  id, organization_id, member_id, task_id, project_id, client_id,
  entry_date, minutes, billable, note, created_at, updated_at
)
SELECT
  'time_axel_github_20260615_lumis_qr_billing_ios_normalized',
  organization_id,
  assignee_member_id,
  id,
  project_id,
  client_id,
  '2026-06-15',
  120,
  1,
  'Stima GitHub 15 giugno: Lumis QR poster, billing, watermark e chiusura iOS build.',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM tasks
WHERE organization_id = 'org_demo_righello'
  AND assignee_member_id = 'mem_axel_wearerighello'
  AND id = 'task_axel_github_20260613_20260615_lumis_qr_billing_ios'
ON CONFLICT(id) DO UPDATE SET
  task_id = excluded.task_id,
  project_id = excluded.project_id,
  client_id = excluded.client_id,
  entry_date = excluded.entry_date,
  minutes = excluded.minutes,
  billable = excluded.billable,
  note = excluded.note,
  updated_at = CURRENT_TIMESTAMP;

UPDATE tasks
SET
  estimated_minutes = 30,
  actual_minutes = 30,
  updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND assignee_member_id = 'mem_axel_wearerighello'
  AND id = 'task_axel_github_20260616_canale77_topbar_focus_clipping';

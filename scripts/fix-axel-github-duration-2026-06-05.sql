-- Correct Axel 2026-06-05 GitHub-imported tasks.
-- The previous import intentionally left actual_minutes=0 and tagged needs-duration.
-- This script applies an operational consuntivo based on the verified GitHub task grouping.

UPDATE tasks
SET
  estimated_minutes = 150,
  actual_minutes = 150,
  tags_json = REPLACE(tags_json, '"needs-duration"', '"duration-github-consuntivo"'),
  updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND assignee_member_id = 'mem_axel_wearerighello'
  AND id = 'task_axel_github_20260604_20260605_optima_beta_runner_stability';

UPDATE tasks
SET
  estimated_minutes = CASE id
    WHEN 'task_axel_github_20260605_righello_site_push_updates' THEN 90
    WHEN 'task_axel_github_20260605_revolut_recovery_supervisor' THEN 120
    WHEN 'task_axel_github_20260605_canale77_production_media_ingest' THEN 120
    WHEN 'task_axel_github_20260605_tetha_agentic_email_worker' THEN 120
    WHEN 'task_axel_github_20260605_solero_admin_ux_cms' THEN 120
    WHEN 'task_axel_github_20260605_buffr_app_store_availability' THEN 30
    WHEN 'task_axel_github_20260605_portopiccolo_dns_cloudflare_mail_migration' THEN 60
    WHEN 'task_axel_github_20260605_obs_football_scorebug_ads' THEN 60
    WHEN 'task_axel_github_20260605_dico_brand_typography' THEN 60
    ELSE estimated_minutes
  END,
  actual_minutes = CASE id
    WHEN 'task_axel_github_20260605_righello_site_push_updates' THEN 90
    WHEN 'task_axel_github_20260605_revolut_recovery_supervisor' THEN 120
    WHEN 'task_axel_github_20260605_canale77_production_media_ingest' THEN 120
    WHEN 'task_axel_github_20260605_tetha_agentic_email_worker' THEN 120
    WHEN 'task_axel_github_20260605_solero_admin_ux_cms' THEN 120
    WHEN 'task_axel_github_20260605_buffr_app_store_availability' THEN 30
    WHEN 'task_axel_github_20260605_portopiccolo_dns_cloudflare_mail_migration' THEN 60
    WHEN 'task_axel_github_20260605_obs_football_scorebug_ads' THEN 60
    WHEN 'task_axel_github_20260605_dico_brand_typography' THEN 60
    ELSE actual_minutes
  END,
  tags_json = REPLACE(tags_json, '"needs-duration"', '"duration-github-consuntivo"'),
  updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND assignee_member_id = 'mem_axel_wearerighello'
  AND id IN (
    'task_axel_github_20260605_righello_site_push_updates',
    'task_axel_github_20260605_revolut_recovery_supervisor',
    'task_axel_github_20260605_canale77_production_media_ingest',
    'task_axel_github_20260605_tetha_agentic_email_worker',
    'task_axel_github_20260605_solero_admin_ux_cms',
    'task_axel_github_20260605_buffr_app_store_availability',
    'task_axel_github_20260605_portopiccolo_dns_cloudflare_mail_migration',
    'task_axel_github_20260605_obs_football_scorebug_ads',
    'task_axel_github_20260605_dico_brand_typography'
  );

INSERT INTO time_entries (
  id, organization_id, member_id, task_id, project_id, client_id,
  entry_date, minutes, billable, note, created_at, updated_at
)
SELECT
  'time_axel_20260605_github_' || id,
  organization_id,
  assignee_member_id,
  id,
  project_id,
  client_id,
  '2026-06-05',
  actual_minutes,
  1,
  'Consuntivo operativo da attivita GitHub verificata: ' || title,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM tasks
WHERE organization_id = 'org_demo_righello'
  AND assignee_member_id = 'mem_axel_wearerighello'
  AND actual_minutes > 0
  AND id IN (
    'task_axel_github_20260605_righello_site_push_updates',
    'task_axel_github_20260605_revolut_recovery_supervisor',
    'task_axel_github_20260605_canale77_production_media_ingest',
    'task_axel_github_20260605_tetha_agentic_email_worker',
    'task_axel_github_20260605_solero_admin_ux_cms',
    'task_axel_github_20260605_buffr_app_store_availability',
    'task_axel_github_20260605_portopiccolo_dns_cloudflare_mail_migration',
    'task_axel_github_20260605_obs_football_scorebug_ads',
    'task_axel_github_20260605_dico_brand_typography'
  )
ON CONFLICT(id) DO UPDATE SET
  minutes = excluded.minutes,
  note = excluded.note,
  updated_at = CURRENT_TIMESTAMP;

-- Idempotent manual task import for Axel Fleureau.
-- Date: 2026-06-13.
-- Source: explicit operational task supplied by Axel.

INSERT OR IGNORE INTO project_members (project_id, member_id, organization_id, role)
VALUES ('project_internal_portopiccolo', 'mem_axel_wearerighello', 'org_demo_righello', 'owner');

INSERT INTO tasks (
  id, organization_id, project_id, assignee_member_id, title, description,
  status, priority, estimated_minutes, actual_minutes, due_at, created_at, updated_at,
  column_id, client_id, client_name, type, score, rich_description,
  assignee_name, tags_json, attachments_json, comments_json, sub_items_json,
  created_by_member_id, assignment_status, assignment_requested_by_member_id,
  assignment_requested_at, assignment_responded_at
)
VALUES (
  'task_axel_portopiccolo_20260613_zoho_eu_dns_cloudflare_email_recovery',
  'org_demo_righello',
  'project_internal_portopiccolo',
  'mem_axel_wearerighello',
  '2026-06-13 - Ripristino operativita email Zoho EU e DNS Cloudflare',
  'Analisi e risoluzione completa della migrazione email Portopiccolo Apartments su nuovo ambiente Zoho Mail EU.',
  'done',
  'urgent',
  840,
  840,
  '2026-06-13T21:00:00.000Z',
  '2026-06-13T07:00:00.000Z',
  CURRENT_TIMESTAMP,
  'done',
  'client_rig_ppap',
  'Portopiccolo',
  'Email operations / DNS recovery',
  10,
  'Analisi e risoluzione completa della migrazione email Portopiccolo Apartments su nuovo ambiente Zoho Mail EU. Creazione e verifica caselle principali, ripristino backup mail storiche da file locali per Info, Daniele e Irina, controllo cartelle e messaggi importati, diagnosi accessi IMAP/SMTP e password applicazione Outlook. Risoluzione errore di recapito 553 Relaying disallowed tramite correzione DNS Cloudflare: aggiornamento MX da Zoho .com a Zoho .eu e aggiornamento SPF con include:zoho.eu, mantenendo SendGrid, Mandrill e DonDominio. Verifica finale su nameserver Cloudflare, resolver pubblici e test di invio/ricezione. Attivita urgente di ripristino continuita operativa email e recapito dominio portopiccoloapartments.com.',
  'Axel Fleureau',
  '["manual-import","2026-06-13","duration-explicit","portopiccolo","zoho-mail-eu","cloudflare-dns","email-migration","imap","smtp","spf","mx","business-continuity"]',
  '[]',
  '[]',
  '[]',
  'mem_axel_wearerighello',
  'accepted',
  'mem_axel_wearerighello',
  '2026-06-13T07:00:00.000Z',
  '2026-06-13T21:00:00.000Z'
)
ON CONFLICT(id) DO UPDATE SET
  project_id = excluded.project_id,
  assignee_member_id = excluded.assignee_member_id,
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  priority = excluded.priority,
  estimated_minutes = excluded.estimated_minutes,
  actual_minutes = excluded.actual_minutes,
  due_at = excluded.due_at,
  created_at = excluded.created_at,
  updated_at = CURRENT_TIMESTAMP,
  column_id = excluded.column_id,
  client_id = excluded.client_id,
  client_name = excluded.client_name,
  type = excluded.type,
  score = excluded.score,
  rich_description = excluded.rich_description,
  assignee_name = excluded.assignee_name,
  tags_json = excluded.tags_json,
  attachments_json = excluded.attachments_json,
  comments_json = excluded.comments_json,
  sub_items_json = excluded.sub_items_json,
  created_by_member_id = excluded.created_by_member_id,
  assignment_status = excluded.assignment_status,
  assignment_requested_by_member_id = excluded.assignment_requested_by_member_id,
  assignment_requested_at = excluded.assignment_requested_at,
  assignment_responded_at = excluded.assignment_responded_at;

INSERT INTO time_entries (
  id, organization_id, member_id, task_id, project_id, client_id,
  entry_date, minutes, billable, note, created_at, updated_at
)
VALUES (
  'time_axel_portopiccolo_20260613_zoho_eu_dns_cloudflare_email_recovery',
  'org_demo_righello',
  'mem_axel_wearerighello',
  'task_axel_portopiccolo_20260613_zoho_eu_dns_cloudflare_email_recovery',
  'project_internal_portopiccolo',
  'client_rig_ppap',
  '2026-06-13',
  840,
  1,
  'Attivita urgente Portopiccolo Apartments: ripristino operativita email Zoho Mail EU, backup mail storiche, diagnostica IMAP/SMTP/Outlook, correzione DNS Cloudflare MX/SPF e verifica recapito dominio.',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT(id) DO UPDATE SET
  task_id = excluded.task_id,
  project_id = excluded.project_id,
  client_id = excluded.client_id,
  entry_date = excluded.entry_date,
  minutes = excluded.minutes,
  billable = excluded.billable,
  note = excluded.note,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO work_days (
  id, organization_id, member_id, entry_date, check_in_at, check_out_at, status, absence_reason, notes
)
VALUES (
  'workday_axel_20260613_github_import',
  'org_demo_righello',
  'mem_axel_wearerighello',
  '2026-06-13',
  '2026-06-13T09:00:00+02:00',
  '2026-06-13T23:00:00+02:00',
  'closed',
  NULL,
  'Presenza ricostruita/aggiornata da attivita operative: task esplicita Portopiccolo Zoho/DNS da 14h più eventuali stime GitHub gia importate. Se serve una giornata a massimo 14h, ribilanciare le stime GitHub precedenti.'
)
ON CONFLICT(organization_id, member_id, entry_date) DO UPDATE SET
  check_in_at = excluded.check_in_at,
  check_out_at = excluded.check_out_at,
  status = excluded.status,
  absence_reason = excluded.absence_reason,
  notes = excluded.notes,
  updated_at = CURRENT_TIMESTAMP;

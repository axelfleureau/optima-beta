-- Seed operativo Axel Fleureau / Righello.
-- Periodo: 2026-05-26 11:50 -> 2026-05-28 15:00 Europe/Rome.
-- Idempotente: evita duplicati su stesso giorno, stesso titolo e stesso assegnatario.

PRAGMA foreign_keys = ON;

INSERT INTO clients (id, organization_id, name, email, company, status, created_at, updated_at)
VALUES
('client_internal_tetha', 'org_demo_righello', 'Tetha', NULL, 'Tetha', 'active', '2026-05-27T07:00:00.000Z', CURRENT_TIMESTAMP),
('client_internal_reguta_gest', 'org_demo_righello', 'Reguta Gest', NULL, 'Reguta Gest', 'active', '2026-05-28T07:00:00.000Z', CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  company = excluded.company,
  status = excluded.status,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO projects (id, organization_id, client_id, name, status, budget_cents, starts_at, due_at, created_at, updated_at)
VALUES
('project_internal_tetha', 'org_demo_righello', 'client_internal_tetha', 'Tetha', 'active', 0, '2026-05-27T07:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-27T07:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_reguta_gest', 'org_demo_righello', 'client_internal_reguta_gest', 'Reguta Gest', 'active', 0, '2026-05-28T07:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-28T07:00:00.000Z', CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  client_id = excluded.client_id,
  name = excluded.name,
  status = excluded.status,
  due_at = excluded.due_at,
  updated_at = CURRENT_TIMESTAMP;

INSERT OR IGNORE INTO project_members (project_id, member_id, organization_id, role)
SELECT id, 'mem_axel_wearerighello', organization_id, 'owner'
FROM projects
WHERE organization_id = 'org_demo_righello';

INSERT OR IGNORE INTO project_members (project_id, member_id, organization_id, role)
SELECT id, 'mem_axel_fleureau', organization_id, 'owner'
FROM projects
WHERE organization_id = 'org_demo_righello';

WITH new_tasks (
  id, organization_id, project_id, assignee_member_id, title, description, status, priority,
  estimated_minutes, actual_minutes, due_at, created_at, updated_at, column_id, client_id,
  client_name, type, score, rich_description, assignee_name, tags_json, attachments_json,
  comments_json, sub_items_json, created_by_member_id, assignment_status,
  assignment_requested_by_member_id, assignment_requested_at, assignment_responded_at,
  assignment_rejection_reason
) AS (
  VALUES
  ('task_axel_ext_20260526_scale_site', 'org_demo_righello', 'project_internal_scale_site', 'mem_axel_wearerighello', '2026-05-26 - Scale Site UX responsive e launch polish post-11:50', 'Rotte legacy, cursore custom, logo navbar, CTA hero, overflow mobile e metodo Scale.', 'done', 'high', 50, 50, '2026-05-26T18:00:00.000Z', '2026-05-26T12:05:00.000Z', '2026-05-26T18:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Frontend / UX', 8, 'Normalizzate le rotte legacy della homepage. Rifinita UX del cursore custom e comportamento hover desktop. Ottimizzato scaling del logo navbar desktop. Allineata colonna CTA hero. Corretto overflow del pitch text mobile. Migliorati diagrammi della metodologia Scale. Allineato laptop mockup hero con la riga CTA. Prevenuto clipping del titolo hero. Inserite visual stock nella sezione metodo. Corretto clipping tra hero e laptop mockup. Rifinito laptop mockup hero. Corretto contrasto logo in light theme. Auditato comportamento CTA e overflow dei testi.', 'Axel Fleureau', '["github-real","2026-05-26","scale-site","frontend","responsive"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-05-26T12:05:00.000Z', '2026-05-26T18:00:00.000Z', NULL),
  ('task_axel_ext_20260526_optima', 'org_demo_righello', 'project_internal_optima', 'mem_axel_wearerighello', '2026-05-26 - Optima auth, clienti, presenze e workflow operativo', 'Proxy Clerk, seed, clienti Righello, rapportini, privacy finanziaria, calendario team e presenze.', 'done', 'urgent', 75, 75, '2026-05-26T18:00:00.000Z', '2026-05-26T12:25:00.000Z', '2026-05-26T18:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Gestionale interno', 10, 'Sistemato proxy Clerk in produzione e operazioni seed. Importati clienti Righello e corretti dati/statistiche management. Migliorato task picker dei rapportini. Aggiunta vista privacy finanziaria interna con reveal controllato. Aggiunto calendario team con feed iCloud. Corretto stato check-in presenze. Aggiunto auto-log dei task workspace completati. Rifinita esperienza del planner editoriale. Normalizzato time tracking del personale.', 'Axel Fleureau', '["github-real","2026-05-26","optima","auth","time-tracking"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-05-26T12:25:00.000Z', '2026-05-26T18:00:00.000Z', NULL),
  ('task_axel_ext_20260526_portopiccolo', 'org_demo_righello', 'project_internal_portopiccolo', 'mem_axel_wearerighello', '2026-05-26 - Portopiccolo UI polish Chi Siamo e footer reveal', 'Avatar team, gallery Chi Siamo e footer reveal.', 'done', 'medium', 30, 30, '2026-05-26T18:00:00.000Z', '2026-05-26T13:00:00.000Z', '2026-05-26T18:00:00.000Z', 'done', 'client_rig_ppap', 'Portopiccolo', 'UI polish', 6, 'Rilassato crop degli avatar team per migliorare resa visiva. Armonizzata spaziatura gallery nella pagina Chi Siamo. Corretto blur del footer reveal a fine pagina.', 'Axel Fleureau', '["github-real","2026-05-26","portopiccolo","ui-polish"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-05-26T13:00:00.000Z', '2026-05-26T18:00:00.000Z', NULL),
  ('task_axel_ext_20260526_lumis', 'org_demo_righello', 'project_internal_lumis_photo_publisher', 'mem_axel_wearerighello', '2026-05-26 - Lumis SEO e compatibility layer R2', 'SEO, metadata, sitemap, robots e compatibilita photo keys R2.', 'done', 'medium', 35, 35, '2026-05-26T18:00:00.000Z', '2026-05-26T13:20:00.000Z', '2026-05-26T18:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'SEO / Backend', 7, 'Migliorata indicizzazione SEO di Lumis. Aggiunti e aggiornati metadata SEO, sitemap e robots. Serviti legacy R2 photo keys per compatibilita immagini e foto storiche.', 'Axel Fleureau', '["github-real","2026-05-26","lumis","seo","r2"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-05-26T13:20:00.000Z', '2026-05-26T18:00:00.000Z', NULL),
  ('task_axel_ext_20260526_revolut', 'org_demo_righello', 'project_internal_revolut_crypto_scalper', 'mem_axel_wearerighello', '2026-05-26 - Revolut winner hold e soglie operative', 'Mantenimento winner, minimi buy e soglie worker.', 'done', 'medium', 25, 25, '2026-05-26T18:00:00.000Z', '2026-05-26T13:40:00.000Z', '2026-05-26T18:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Trading Automation', 7, 'Rafforzata logica di mantenimento winner e minimi buy. Migliorate soglie operative del worker per evitare operazioni deboli.', 'Axel Fleureau', '["github-real","2026-05-26","revolut","risk-logic"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-05-26T13:40:00.000Z', '2026-05-26T18:00:00.000Z', NULL),

  ('task_axel_ext_20260527_scale_site', 'org_demo_righello', 'project_internal_scale_site', 'mem_axel_wearerighello', '2026-05-27 - Scale Site authority storytelling e mobile polish', 'OpenClaw Hermes, event authority, field signal mobile e copy UX.', 'done', 'medium', 45, 45, '2026-05-27T18:00:00.000Z', '2026-05-27T09:00:00.000Z', '2026-05-27T18:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Branding / SEO', 7, 'Aggiunta sezione autorevolezza OpenClaw Hermes. Rifinita sezione event authority. Rimossa implicazione Swiss dalla sezione evento. Allineate metriche field signal su mobile. Continuato polish copy/UX delle sezioni pubbliche.', 'Axel Fleureau', '["github-real","2026-05-27","scale-site","storytelling","seo"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-05-27T09:00:00.000Z', '2026-05-27T18:00:00.000Z', NULL),
  ('task_axel_ext_20260527_revolut', 'org_demo_righello', 'project_internal_revolut_crypto_scalper', 'mem_axel_wearerighello', '2026-05-27 - Revolut drawdown, scanner e buy guard tests', 'Metriche performance, gate rotazioni, scanner e test backend.', 'done', 'high', 60, 60, '2026-05-27T18:00:00.000Z', '2026-05-27T09:35:00.000Z', '2026-05-27T18:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Backend / Testing', 8, 'Corretto denominatore drawdown nelle metriche performance. Rafforzati gate di execution per le rotazioni. Normalizzati simboli scanner annotati. Aggiunti e aggiornati test su metriche, scanner e buy guards.', 'Axel Fleureau', '["github-real","2026-05-27","revolut","metrics","testing"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-05-27T09:35:00.000Z', '2026-05-27T18:00:00.000Z', NULL),
  ('task_axel_ext_20260527_optima', 'org_demo_righello', 'project_internal_optima', 'mem_axel_wearerighello', '2026-05-27 - Optima team deferred invites, mobile scroll e command bar', 'Employee record senza invito, Cloudflare worker, scrolling mobile, kanban e command bar.', 'done', 'urgent', 90, 90, '2026-05-27T18:00:00.000Z', '2026-05-27T10:10:00.000Z', '2026-05-27T18:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Product Engineering', 10, 'Aggiunti deferred team member invites. Consentita gestione employee record anche senza invito email. Corretto scroll mobile nella pagina presenze. Minificato bundle Cloudflare Worker. Stabilizzato scrolling viewport mobile. Corretto execution flow della command bar. Corretto scroll orizzontale mobile del kanban. Sistemati feedback ed esecuzione command bar.', 'Axel Fleureau', '["github-real","2026-05-27","optima","mobile-ux","command-bar"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-05-27T10:10:00.000Z', '2026-05-27T18:00:00.000Z', NULL),
  ('task_axel_ext_20260527_portopiccolo', 'org_demo_righello', 'project_internal_portopiccolo', 'mem_axel_wearerighello', '2026-05-27 - Portopiccolo audit e sync Avantio Guesty', 'Audit giornaliero, GitHub Actions, sync sicuro, login headless e scheduler.', 'done', 'high', 80, 80, '2026-05-27T18:00:00.000Z', '2026-05-27T11:00:00.000Z', '2026-05-27T18:00:00.000Z', 'done', 'client_rig_ppap', 'Portopiccolo', 'Automation / Booking Ops', 9, 'Aggiunto audit giornaliero Avantio/Guesty. Aggiunto workflow GitHub Actions per audit quotidiano. Aggiunto trigger audit Avantio/Guesty. Abilitata sincronizzazione sicura Avantio/Guesty. Aperte prenotazioni Avantio prima del sync. Allineato workflow su base login Avantio. Rafforzato login headless Avantio. Aggiunto scheduler locale Avantio/Guesty.', 'Axel Fleureau', '["github-real","2026-05-27","portopiccolo","avantio","guesty"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-05-27T11:00:00.000Z', '2026-05-27T18:00:00.000Z', NULL),
  ('task_axel_ext_20260527_buffr', 'org_demo_righello', 'project_internal_buffr', 'mem_axel_wearerighello', '2026-05-27 - BUFFR gallery video playback stability', 'Stabilita riproduzione video e componenti gallery.', 'done', 'medium', 30, 30, '2026-05-27T18:00:00.000Z', '2026-05-27T12:00:00.000Z', '2026-05-27T18:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Mobile / Gallery UX', 6, 'Stabilizzata riproduzione video nella gallery. Aggiornati componenti gallery e gestione playback.', 'Axel Fleureau', '["github-real","2026-05-27","buffr","gallery","video"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-05-27T12:00:00.000Z', '2026-05-27T18:00:00.000Z', NULL),
  ('task_axel_ext_20260527_tetha', 'org_demo_righello', 'project_internal_tetha', 'mem_axel_wearerighello', '2026-05-27 - Tetha preventivi, dossier lavoratore e deploy', 'Generazione preventivi, export dossier, lockfile e storico listino.', 'done', 'high', 70, 70, '2026-05-27T18:00:00.000Z', '2026-05-27T12:30:00.000Z', '2026-05-27T18:00:00.000Z', 'done', 'client_internal_tetha', 'Tetha', 'Gestionale / Preventivi', 8, 'Aggiunta generazione preventivi. Aggiunto export dossier lavoratore. Allineato lockfile npm per deploy. Mantenuto disponibile storico listino prezzi.', 'Axel Fleureau', '["github-real","2026-05-27","tetha","quotes","deploy"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-05-27T12:30:00.000Z', '2026-05-27T18:00:00.000Z', NULL),

  ('task_axel_ext_20260528_tetha', 'org_demo_righello', 'project_internal_tetha', 'mem_axel_wearerighello', '2026-05-28 - Tetha AI quote assistant e storico preventivi', 'Notifiche persistenti, auth UX, AI preventivi, listino storico e storico preventivi.', 'done', 'high', 90, 90, '2026-05-28T15:00:00.000Z', '2026-05-28T08:30:00.000Z', '2026-05-28T15:00:00.000Z', 'done', 'client_internal_tetha', 'Tetha', 'AI / Preventivi', 9, 'Serializzate notifiche persistenti. Migliorata visualizzazione errori di autenticazione login. Aggiunto assistente AI per preventivi. Normalizzato listino prezzi storico. Aggiunti storico preventivi e numerazione. Nascosti preventivi di test dallo storico.', 'Axel Fleureau', '["github-real","2026-05-28","tetha","ai","quotes"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-05-28T08:30:00.000Z', '2026-05-28T15:00:00.000Z', NULL),
  ('task_axel_ext_20260528_reguta_gest', 'org_demo_righello', 'project_internal_reguta_gest', 'mem_axel_wearerighello', '2026-05-28 - Reguta Gest Cloudflare demo cliente e hardening API', 'Deploy Cloudflare, demo read-only/admin, credenziali demo, API e scadenze macchinari.', 'done', 'high', 90, 90, '2026-05-28T15:00:00.000Z', '2026-05-28T09:10:00.000Z', '2026-05-28T15:00:00.000Z', 'done', 'client_internal_reguta_gest', 'Reguta Gest', 'Cloudflare / Demo Client', 8, 'Preparato deploy Cloudflare per test cliente. Aggiunto accesso demo pubblico read-only. Inserito banner credenziali demo. Rafforzato error handling demo e API. Reso accesso demo amministrativo. Corretti link scadenze macchinari.', 'Axel Fleureau', '["github-real","2026-05-28","reguta-gest","cloudflare","demo"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-05-28T09:10:00.000Z', '2026-05-28T15:00:00.000Z', NULL),
  ('task_axel_ext_20260528_portopiccolo', 'org_demo_righello', 'project_internal_portopiccolo', 'mem_axel_wearerighello', '2026-05-28 - Portopiccolo Guesty mapping e owner reservations Avantio', 'Listing Guesty, Lighthouse Beach, owner reservations e audit sync.', 'done', 'high', 60, 60, '2026-05-28T15:00:00.000Z', '2026-05-28T09:50:00.000Z', '2026-05-28T15:00:00.000Z', 'done', 'client_rig_ppap', 'Portopiccolo', 'Booking Ops', 8, 'Mappate listing Guesty confermate. Chiarita mappatura Guesty per Lighthouse Beach. Gestite owner reservations Avantio. Rifinita integrazione audit/sync Avantio/Guesty.', 'Axel Fleureau', '["github-real","2026-05-28","portopiccolo","guesty","avantio"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-05-28T09:50:00.000Z', '2026-05-28T15:00:00.000Z', NULL),
  ('task_axel_ext_20260528_scale_site', 'org_demo_righello', 'project_internal_scale_site', 'mem_axel_wearerighello', '2026-05-28 - Scale Site SEO narrative e responsive polish', 'Copy SEO, storytelling, responsive e aggiornamenti post-evento.', 'done', 'medium', 70, 70, '2026-05-28T15:00:00.000Z', '2026-05-28T10:20:00.000Z', '2026-05-28T15:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'SEO / Copywriting', 7, 'Rifinita copy e narrativa SEO Scale. Rafforzato storytelling pubblico del sito. Rifiniti dettagli responsive. Auto-aggiornata copy conference dopo evento. Continuata ottimizzazione contenuti, sezioni e narrativa commerciale.', 'Axel Fleureau', '["github-real","2026-05-28","scale-site","seo","copywriting"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-05-28T10:20:00.000Z', '2026-05-28T15:00:00.000Z', NULL),
  ('task_axel_ext_20260528_solero', 'org_demo_righello', 'project_internal_solero_sport_village', 'mem_axel_wearerighello', '2026-05-28 - Solero scroll gallery, Koala mobile e logo CSEN', 'Scroll home gallery, sezioni Koala, logo CSEN e social link.', 'done', 'medium', 55, 55, '2026-05-28T15:00:00.000Z', '2026-05-28T11:10:00.000Z', '2026-05-28T15:00:00.000Z', 'done', 'client_rig_ssvo', 'Solero Sport Village', 'Frontend / Mobile UX', 7, 'Corretta stabilita scroll home gallery. Sistemate sezioni mobile bianche nella pagina Koala. Corretto logo affiliazione CSEN mancante. Rimosso link social YouTube. Reso logo affiliazione CSEN affidabile nel render.', 'Axel Fleureau', '["github-real","2026-05-28","solero","mobile","branding"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-05-28T11:10:00.000Z', '2026-05-28T15:00:00.000Z', NULL),
  ('task_axel_ext_20260528_buffr', 'org_demo_righello', 'project_internal_buffr', 'mem_axel_wearerighello', '2026-05-28 - BUFFR public privacy support pages', 'Privacy/support pubbliche e worker per contenuti review release.', 'done', 'medium', 35, 35, '2026-05-28T15:00:00.000Z', '2026-05-28T11:45:00.000Z', '2026-05-28T15:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'App Store readiness', 6, 'Aggiunte pagine pubbliche privacy e supporto. Aggiornato worker per servire e supportare contenuti pubblici richiesti per review/release.', 'Axel Fleureau', '["github-real","2026-05-28","buffr","app-store","compliance"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-05-28T11:45:00.000Z', '2026-05-28T15:00:00.000Z', NULL)
)
INSERT INTO tasks (
  id, organization_id, project_id, assignee_member_id, title, description, status, priority,
  estimated_minutes, actual_minutes, due_at, created_at, updated_at, column_id, client_id,
  client_name, type, score, rich_description, assignee_name, tags_json, attachments_json,
  comments_json, sub_items_json, created_by_member_id, assignment_status,
  assignment_requested_by_member_id, assignment_requested_at, assignment_responded_at,
  assignment_rejection_reason
)
SELECT *
FROM new_tasks nt
WHERE NOT EXISTS (
  SELECT 1
  FROM tasks t
  WHERE t.organization_id = nt.organization_id
    AND t.assignee_member_id = nt.assignee_member_id
    AND date(t.created_at) = date(nt.created_at)
    AND lower(t.title) = lower(nt.title)
);

INSERT INTO time_entries (
  id, organization_id, member_id, task_id, project_id, entry_date, minutes,
  billable, note, approved_by_member_id, approved_at, created_at, updated_at
)
SELECT
  'time_' || id,
  organization_id,
  assignee_member_id,
  id,
  project_id,
  substr(created_at, 1, 10),
  actual_minutes,
  CASE WHEN client_id IN ('client_rig_ssvo', 'client_rig_ppap', 'client_rig_finestre_art') THEN 1 ELSE 0 END,
  title,
  assignee_member_id,
  updated_at,
  created_at,
  updated_at
FROM tasks
WHERE organization_id = 'org_demo_righello'
  AND id LIKE 'task_axel_ext_202605%'
  AND actual_minutes > 0
ON CONFLICT(id) DO UPDATE SET
  task_id = excluded.task_id,
  project_id = excluded.project_id,
  entry_date = excluded.entry_date,
  minutes = excluded.minutes,
  billable = excluded.billable,
  note = excluded.note,
  approved_by_member_id = excluded.approved_by_member_id,
  approved_at = excluded.approved_at,
  updated_at = excluded.updated_at;

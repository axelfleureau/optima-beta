-- Seed operativo Axel Fleureau / Righello.
-- Periodo: 2026-06-03 09:36 -> 2026-06-03 17:39 Europe/Rome.
-- Idempotente: evita duplicati su stesso giorno, stesso titolo e stesso assegnatario.

PRAGMA foreign_keys = ON;

INSERT INTO clients (id, organization_id, name, email, company, status, created_at, updated_at)
VALUES
('client_internal_righello_ops', 'org_demo_righello', 'Righello', NULL, 'Righello', 'active', '2026-05-22T08:00:00.000Z', CURRENT_TIMESTAMP),
('client_rig_ppap', 'org_demo_righello', 'Portopiccolo', NULL, 'Portopiccolo Apartments', 'active', '2026-05-22T08:00:00.000Z', CURRENT_TIMESTAMP),
('client_rig_ssvo', 'org_demo_righello', 'Solero Sport Village', NULL, 'Solero Sport Village', 'active', '2026-05-22T08:00:00.000Z', CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  company = excluded.company,
  status = excluded.status,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO projects (id, organization_id, client_id, name, status, budget_cents, starts_at, due_at, created_at, updated_at)
VALUES
('project_internal_portopiccolo', 'org_demo_righello', 'client_rig_ppap', 'Portopiccolo', 'active', 0, '2026-05-22T08:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-22T08:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_optima', 'org_demo_righello', 'client_internal_righello_ops', 'Optima', 'active', 0, '2026-05-23T08:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-23T08:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_solero_sport_village', 'org_demo_righello', 'client_rig_ssvo', 'Solero Sport Village', 'active', 0, '2026-05-22T08:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-22T08:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_revolut_crypto_scalper', 'org_demo_righello', 'client_internal_righello_ops', 'Revolut Crypto Scalper', 'active', 0, '2026-05-23T08:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-23T08:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_scale_site', 'org_demo_righello', 'client_internal_righello_ops', 'Scale Site', 'active', 0, '2026-05-25T08:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-25T08:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_righello_site', 'org_demo_righello', 'client_internal_righello_ops', 'Righello Site', 'active', 0, '2026-06-03T07:36:00.000Z', '2026-06-30T18:00:00.000Z', '2026-06-03T07:36:00.000Z', CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  client_id = excluded.client_id,
  name = excluded.name,
  status = excluded.status,
  due_at = excluded.due_at,
  updated_at = CURRENT_TIMESTAMP;

INSERT OR IGNORE INTO project_members (project_id, member_id, organization_id, role)
SELECT id, 'mem_axel_wearerighello', organization_id, 'owner'
FROM projects
WHERE organization_id = 'org_demo_righello'
  AND id IN (
    'project_internal_portopiccolo',
    'project_internal_optima',
    'project_internal_solero_sport_village',
    'project_internal_revolut_crypto_scalper',
    'project_internal_scale_site',
    'project_internal_righello_site'
  );

WITH new_tasks (
  id, organization_id, project_id, assignee_member_id, title, description, status, priority,
  estimated_minutes, actual_minutes, due_at, created_at, updated_at, column_id, client_id,
  client_name, type, score, rich_description, assignee_name, tags_json, attachments_json,
  comments_json, sub_items_json, created_by_member_id, assignment_status,
  assignment_requested_by_member_id, assignment_requested_at, assignment_responded_at,
  assignment_rejection_reason
) AS (
  VALUES
  ('task_axel_ext4_20260603_portopiccolo_afternoon', 'org_demo_righello', 'project_internal_portopiccolo', 'mem_axel_wearerighello', '2026-06-03 - Portopiccolo direct booking and Avantio Guesty hardening', 'Consolidamento flusso booking diretto Guesty, checkout, fallback, sync Avantio Guesty e rifiniture mobile.', 'done', 'high', 140, 140, '2026-06-03T17:39:00.000Z', '2026-06-03T09:36:00.000Z', '2026-06-03T17:39:00.000Z', 'done', 'client_rig_ppap', 'Portopiccolo', 'Booking / Operations', 10, 'Consolidamento del flusso di prenotazione diretta Guesty, con correzione dei fallback di booking, pricing e availability lato frontend/API. Estensione del processo di checkout con gestione animali domestici, miglioramento della pagina di conferma e stabilizzazione dell esperienza utente in caso di fallback. Hardening tecnico della sincronizzazione Avantio -> Guesty, inclusi allineamento prenotazioni esistenti, scraping Avantio, client Guesty, stato sync e script locale di migrazione. Pulizia accessi pubblici con rimozione portale proprietari dal frontend pubblico e riallineamento navbar/footer/route. Rifiniture UI mobile su scheda appartamento, sidebar booking e layout lista appartamenti. Aggiornamenti contenutistici e visuali: timelapse Chi Siamo, webcam Skyline in area contatti, gestione embed/link card e rimozione gallery finale in home.', 'Axel Fleureau', '["github-real","2026-06-03","portopiccolo","guesty","avantio","booking","mobile-ux"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-03T09:36:00.000Z', '2026-06-03T17:39:00.000Z', NULL),
  ('task_axel_ext4_20260603_optima_afternoon', 'org_demo_righello', 'project_internal_optima', 'mem_axel_wearerighello', '2026-06-03 - Optima client knowledge portal and operational import workflow', 'Portale conoscenza cliente, import rapporti task, presenze, sidekick AI, workspace e stati task importati.', 'done', 'high', 150, 150, '2026-06-03T17:39:00.000Z', '2026-06-03T10:00:00.000Z', '2026-06-03T17:39:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Gestionale interno / Product', 10, 'Sviluppo del portale conoscenza cliente con nuove pagine dashboard, API dedicate, cifratura/supporto crypto e migration database. Implementazione dell import operativo dei rapporti task: pagina dedicata, API import, componente importer, integrazione command bar e script SQL di seed/normalizzazione. Evoluzione del modulo presenze: azioni assenze team, calendario presenze, heatmap piu leggibile, colonna persone collassabile, nomi compatti e indicatori secondari per anomalie orarie. Sostituzione del page tour con sidekick AI contestuale e riposizionamento del launcher Opi. Correzione workspace: default view, alias Kanban e persistenza layout. Normalizzazione stato task importati: gestione task in progress/completati e classificazione coerente del prodotto Righello Live Studio.', 'Axel Fleureau', '["github-real","2026-06-03","optima","knowledge-portal","task-import","presenze","sidekick-ai"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-03T10:00:00.000Z', '2026-06-03T17:39:00.000Z', NULL),
  ('task_axel_ext4_20260603_solero_afternoon', 'org_demo_righello', 'project_internal_solero_sport_village', 'mem_axel_wearerighello', '2026-06-03 - Solero mobile hero stability and admin UX refinement', 'Hero mobile stabile e pannello admin piu navigabile per login, calendario, audit, corsi e impostazioni.', 'done', 'medium', 45, 45, '2026-06-03T17:39:00.000Z', '2026-06-03T11:00:00.000Z', '2026-06-03T17:39:00.000Z', 'done', 'client_rig_ssvo', 'Solero Sport Village', 'Frontend / Admin CMS', 7, 'Stabilizzazione hero mobile della home, con correzioni su scroll motion, altezza reale del contenuto e comportamento responsive. Rifinitura dell esperienza admin Solero su login, calendario, audit contenuti, corsi, discipline, programmazione e impostazioni. Miglioramento della navigabilita e chiarezza operativa del pannello amministrativo.', 'Axel Fleureau', '["github-real","2026-06-03","solero","hero","mobile-ux","admin-cms"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-03T11:00:00.000Z', '2026-06-03T17:39:00.000Z', NULL),
  ('task_axel_ext4_20260603_revolut_afternoon', 'org_demo_righello', 'project_internal_revolut_crypto_scalper', 'mem_axel_wearerighello', '2026-06-03 - Revolut negative expectancy rotation guard', 'Blocco rotazioni proattive con expectancy negativa e copertura test buy guard.', 'done', 'medium', 25, 25, '2026-06-03T17:39:00.000Z', '2026-06-03T11:30:00.000Z', '2026-06-03T17:39:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Trading Automation / Risk Management', 6, 'Inserito blocco operativo contro rotazioni proattive con expectancy negativa, rafforzando i guardrail della logica di acquisto. Aggiunta copertura test per i buy guard del worker.', 'Axel Fleureau', '["github-real","2026-06-03","revolut","risk-management","buy-guards","testing"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-03T11:30:00.000Z', '2026-06-03T17:39:00.000Z', NULL),
  ('task_axel_ext4_20260603_scale_afternoon', 'org_demo_righello', 'project_internal_scale_site', 'mem_axel_wearerighello', '2026-06-03 - Scale product case studies and AI search entity signals', 'Case study BUFFR, Lumis, Optima, Tetha e live control room con SEO/entity signals.', 'done', 'high', 70, 70, '2026-06-03T17:39:00.000Z', '2026-06-03T12:00:00.000Z', '2026-06-03T17:39:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'SEO / Design System', 8, 'Creazione di case study prodotto per Scale, con nuove pagine, componenti visuali, dati strutturati e asset dedicati per BUFFR, Lumis, Optima, Tetha e live control room. Rifinitura hero layout dei case study prodotto. Rafforzamento SEO/entity signals: metadata localizzati, sitemap, llms.txt, dati servizi/progetti e segnali semantici per indicizzazione e AI search. Criticita aperta rilevata: CI/CD fallita per formatting Prettier.', 'Axel Fleureau', '["github-real","2026-06-03","scale-site","case-studies","seo","ai-search"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-03T12:00:00.000Z', '2026-06-03T17:39:00.000Z', NULL),
  ('task_axel_ext4_20260603_righello_site_afternoon', 'org_demo_righello', 'project_internal_righello_site', 'mem_axel_wearerighello', '2026-06-03 - Righello Site local SEO Pordenone Mestre and mobile menu scroll', 'SEO locale Pordenone/Mestre, nuova pagina verticale, sitemap e scroll menu mobile.', 'done', 'medium', 53, 53, '2026-06-03T17:39:00.000Z', '2026-06-03T12:30:00.000Z', '2026-06-03T17:39:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'SEO locale / Sito Righello', 7, 'Miglioramento SEO locale per Pordenone e Mestre, con nuova pagina verticale agenzia-marketing-pordenone, aggiornamento sitemap, layout, servizi, FAQ, footer e pagine principali. Correzione scroll del menu mobile in navbar. Criticita aperta rilevata: CI/CD fallita per lockfile npm non sincronizzato.', 'Axel Fleureau', '["github-real","2026-06-03","righello-site","seo-locale","mobile-menu"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-03T12:30:00.000Z', '2026-06-03T17:39:00.000Z', NULL)
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
  CASE WHEN client_id IN ('client_rig_ssvo', 'client_rig_ppap') THEN 1 ELSE 0 END,
  title,
  assignee_member_id,
  updated_at,
  created_at,
  updated_at
FROM tasks
WHERE organization_id = 'org_demo_righello'
  AND id LIKE 'task_axel_ext4_20260603_%'
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

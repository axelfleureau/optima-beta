-- Seed operativo Axel Fleureau / Righello.
-- Periodo: 2026-06-01 23:32 -> 2026-06-03 09:36 Europe/Rome.
-- Idempotente: evita duplicati su stesso giorno, stesso titolo e stesso assegnatario.

PRAGMA foreign_keys = ON;

INSERT INTO clients (id, organization_id, name, email, company, status, created_at, updated_at)
VALUES
('client_internal_righello_ops', 'org_demo_righello', 'Righello', NULL, 'Righello', 'active', '2026-05-22T08:00:00.000Z', CURRENT_TIMESTAMP),
('client_rig_ssvo', 'org_demo_righello', 'Solero Sport Village', NULL, 'Solero Sport Village', 'active', '2026-05-22T08:00:00.000Z', CURRENT_TIMESTAMP),
('client_rig_ppap', 'org_demo_righello', 'Portopiccolo', NULL, 'Portopiccolo Apartments', 'active', '2026-05-22T08:00:00.000Z', CURRENT_TIMESTAMP),
('client_rig_finestre_art', 'org_demo_righello', 'Finestre Art', NULL, 'Finestre Art', 'active', '2026-05-22T08:00:00.000Z', CURRENT_TIMESTAMP),
('client_internal_canale77', 'org_demo_righello', 'Canale77', NULL, 'Canale77', 'active', '2026-06-01T07:00:00.000Z', CURRENT_TIMESTAMP),
('client_internal_dico_online', 'org_demo_righello', 'DICO Online', NULL, 'DICO Online', 'active', '2026-05-28T13:00:00.000Z', CURRENT_TIMESTAMP),
('client_internal_obs_padel', 'org_demo_righello', 'OBS Padel Stream Overlay', NULL, 'OBS Padel Stream Overlay', 'active', '2026-05-28T13:00:00.000Z', CURRENT_TIMESTAMP),
('client_rig_reca', 'org_demo_righello', 'Reguta Cantina / Anselmi', NULL, 'Reguta Cantina / Anselmi', 'active', '2026-05-28T07:00:00.000Z', CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  company = excluded.company,
  status = excluded.status,
  updated_at = CURRENT_TIMESTAMP;

-- Reguta Gest e un progetto gestionale per Reguta Cantina / Anselmi, non un cliente.
UPDATE projects
SET client_id = 'client_rig_reca', updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND id = 'project_internal_reguta_gest';

UPDATE tasks
SET client_id = 'client_rig_reca',
    client_name = 'Reguta Cantina / Anselmi',
    updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND project_id = 'project_internal_reguta_gest';

DELETE FROM clients
WHERE id IN ('client_internal_reguta_gest', 'client_rig_reguta_anselmi')
  AND organization_id = 'org_demo_righello';

INSERT INTO projects (id, organization_id, client_id, name, status, budget_cents, starts_at, due_at, created_at, updated_at)
VALUES
('project_internal_solero_sport_village', 'org_demo_righello', 'client_rig_ssvo', 'Solero Sport Village', 'active', 0, '2026-05-22T08:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-22T08:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_revolut_crypto_scalper', 'org_demo_righello', 'client_internal_righello_ops', 'Revolut Crypto Scalper', 'active', 0, '2026-05-23T08:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-23T08:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_optima', 'org_demo_righello', 'client_internal_righello_ops', 'Optima', 'active', 0, '2026-05-23T08:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-23T08:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_portopiccolo', 'org_demo_righello', 'client_rig_ppap', 'Portopiccolo', 'active', 0, '2026-05-22T08:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-22T08:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_finestre_art', 'org_demo_righello', 'client_rig_finestre_art', 'Finestre Art', 'active', 0, '2026-05-22T08:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-22T08:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_canale77_ott_platform', 'org_demo_righello', 'client_internal_canale77', 'Canale77 OTT Platform', 'active', 0, '2026-06-01T07:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-06-01T07:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_dico_online_site', 'org_demo_righello', 'client_internal_dico_online', 'DICO Online Site', 'active', 0, '2026-05-28T13:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-28T13:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_obs_padel_stream_overlay', 'org_demo_righello', 'client_internal_obs_padel', 'OBS Padel Stream Overlay', 'active', 0, '2026-05-28T13:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-28T13:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_scale_site', 'org_demo_righello', 'client_internal_righello_ops', 'Scale Site', 'active', 0, '2026-05-25T08:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-25T08:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_reguta_gest', 'org_demo_righello', 'client_rig_reca', 'Reguta Gest', 'active', 0, '2026-05-28T07:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-28T07:00:00.000Z', CURRENT_TIMESTAMP)
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

WITH new_tasks (
  id, organization_id, project_id, assignee_member_id, title, description, status, priority,
  estimated_minutes, actual_minutes, due_at, created_at, updated_at, column_id, client_id,
  client_name, type, score, rich_description, assignee_name, tags_json, attachments_json,
  comments_json, sub_items_json, created_by_member_id, assignment_status,
  assignment_requested_by_member_id, assignment_requested_at, assignment_responded_at,
  assignment_rejection_reason
) AS (
  VALUES
  ('task_axel_ext3_20260601_solero_evening', 'org_demo_righello', 'project_internal_solero_sport_village', 'mem_axel_wearerighello', '2026-06-01 sera - Solero mobile hero UX stability', 'Stabilita UX mobile, animazione logo hero e riduzione instabilita visive.', 'done', 'medium', 45, 45, '2026-06-01T23:32:00.000Z', '2026-06-01T21:00:00.000Z', '2026-06-01T23:32:00.000Z', 'done', 'client_rig_ssvo', 'Solero Sport Village', 'Frontend / Mobile UX', 6, 'Migliorata stabilita UX mobile. Rifinita animazione logo hero mobile. Avviata ottimizzazione dell esperienza hero/mobile per ridurre instabilita visive.', 'Axel Fleureau', '["github-real","2026-06-01-sera","solero","mobile-ux","hero"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-01T21:00:00.000Z', '2026-06-01T23:32:00.000Z', NULL),

  ('task_axel_ext3_20260602_revolut', 'org_demo_righello', 'project_internal_revolut_crypto_scalper', 'mem_axel_wearerighello', '2026-06-02 - Revolut scout deployment, stale fills and defensive derisk', 'Daily cap, scout high-momentum, wallet cost basis, stale fills, equity ratchet e kill switch derisk.', 'done', 'urgent', 180, 180, '2026-06-02T18:00:00.000Z', '2026-06-02T09:00:00.000Z', '2026-06-02T18:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Trading Automation / Risk Management', 10, 'Usato net buy deployment per calcolo daily cap. Consentiti scout a basso volume confermati da tape. Preservato sizing strategico degli scout. Mantenuta scansione opportunita attiva anche in regime risk-off. Consentito overlay daily breakout su liquidita disponibile. Ridotto cooldown dopo cancellazioni buy non eseguite. Resa resiliente la persistenza delle opportunita scanner. Consentito maggiore deploy di liquidita idle su scout high-momentum. Riparato cost basis posizioni sincronizzate da wallet. Aggiunta profit consolidation per winner. Riconciliati ordini filled dopo stale cancel. Evitato double counting di stale fills gia riconciliati. Aggiunta modalita equity ratchet defensive. Consentiti acquisti breakout con idle cash oltre daily cap. Inizializzato flag breakout cap overlay. Prioritizzato derisk per perdita in dollari durante defensive drawdown. Bypassato sell cooldown per derisk in drawdown. Consentite vendite protettive durante kill switch.', 'Axel Fleureau', '["github-real","2026-06-02","revolut","scanner","risk-management","execution"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-02T09:00:00.000Z', '2026-06-02T18:00:00.000Z', NULL),
  ('task_axel_ext3_20260602_solero', 'org_demo_righello', 'project_internal_solero_sport_village', 'mem_axel_wearerighello', '2026-06-02 - Solero admin CMS course scheduling and hero recovery', 'Know-how centralizzato, admin corsi, Firestore IDs, preview draft, Safari recovery e motion hero.', 'done', 'high', 160, 160, '2026-06-02T18:00:00.000Z', '2026-06-02T09:30:00.000Z', '2026-06-02T18:00:00.000Z', 'done', 'client_rig_ssvo', 'Solero Sport Village', 'Admin CMS / Hero Performance', 9, 'Aggiunte skill di know-how sviluppo e poi rimosse dal progetto locale per centralizzarle globalmente. Aggiunta configurazione know-how generale su mobile, SEO, motion, sicurezza, deploy e design. Rimosso know-how project-local per evitare duplicazioni. Migliorata chiarezza copy admin corsi. Corretto overflow dialog admin. Rafforzata chiarezza e sicurezza persistenza admin. Resi completamente configurabili i filtri eta corsi. Rifinita animazione logo hero mobile. Chiarito flusso admin scheduling corsi. Rese modificabili le macro aree dei servizi. Corretto update corsi admin con Firestore IDs. Aggiunta preview live draft corsi. Migliorato recovery chunk Safari e home error recovery. Resa preview corsi coerente con layout pubblico. Ripristinato motion hero mobile e fallback Safari. Migliorati ending scroll hero desktop e motion hero mobile.', 'Axel Fleureau', '["github-real","2026-06-02","solero","admin-cms","firestore","safari","hero"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-02T09:30:00.000Z', '2026-06-02T18:00:00.000Z', NULL),
  ('task_axel_ext3_20260602_optima', 'org_demo_righello', 'project_internal_optima', 'mem_axel_wearerighello', '2026-06-02 - Optima heatmap, task seed, page guide and mobile sidebar', 'Heatmap presenze, task Axel, know-how, orario ufficio, project card, guida AI e sidebar mobile.', 'done', 'high', 120, 120, '2026-06-02T18:00:00.000Z', '2026-06-02T10:00:00.000Z', '2026-06-02T18:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Gestionale interno / Mobile UX', 8, 'Migliorata visibilita heatmap presenze. Aggiunti task operativi Axel fino al 1 giugno. Aggiunte micro-skill di know-how sviluppo. Spostate note know-how fuori dal progetto locale. Migliorata heatmap presenze mobile. Corretta semantica default orario ufficio. Migliorate project card management mobile. Aggiunta guida AI contestuale sulle pagine. Rifinita navigazione sidebar mobile.', 'Axel Fleureau', '["github-real","2026-06-02","optima","presenze","mobile","ai-guide","sidebar"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-02T10:00:00.000Z', '2026-06-02T18:00:00.000Z', NULL),
  ('task_axel_ext3_20260602_portopiccolo', 'org_demo_righello', 'project_internal_portopiccolo', 'mem_axel_wearerighello', '2026-06-02 - Portopiccolo Avantio/Guesty reconciliation and guest area bridge', 'Prenotazioni e contatti Avantio, checkout Guesty, area ospite, preloader e GuestyPay fallback.', 'done', 'high', 90, 90, '2026-06-02T18:00:00.000Z', '2026-06-02T10:30:00.000Z', '2026-06-02T18:00:00.000Z', 'done', 'client_rig_ppap', 'Portopiccolo', 'Booking Engine / UX', 8, 'Corretta riconciliazione prenotazioni Avantio/Guesty. Corretta riconciliazione contatti ospiti Avantio. Rafforzato flusso checkout Guesty. Aggiunto bridge Area Ospite Guesty. Spostati link accesso fuori dal menu principale. Velocizzato home preloader. Rifinita sezione contatto investimenti. Chiarito fallback checkout GuestyPay.', 'Axel Fleureau', '["github-real","2026-06-02","portopiccolo","guesty","avantio","checkout"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-02T10:30:00.000Z', '2026-06-02T18:00:00.000Z', NULL),
  ('task_axel_ext3_20260602_finestre_art', 'org_demo_righello', 'project_internal_finestre_art', 'mem_axel_wearerighello', '2026-06-02 - Finestre Art premium home reveal and product visuals', 'Reveal premium in home e immagini product-focused.', 'done', 'medium', 45, 45, '2026-06-02T18:00:00.000Z', '2026-06-02T11:00:00.000Z', '2026-06-02T18:00:00.000Z', 'done', 'client_rig_finestre_art', 'Finestre Art', 'Frontend / Branding', 6, 'Aggiunto reveal premium in home. Sostituite immagini home con visual piu product-focused.', 'Axel Fleureau', '["github-real","2026-06-02","finestre-art","home","branding"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-02T11:00:00.000Z', '2026-06-02T18:00:00.000Z', NULL),
  ('task_axel_ext3_20260602_canale77', 'org_demo_righello', 'project_internal_canale77_ott_platform', 'mem_axel_wearerighello', '2026-06-02 - Canale77 know-how cleanup', 'Skill know-how di progetto spostate fuori dal repository.', 'done', 'low', 30, 30, '2026-06-02T18:00:00.000Z', '2026-06-02T11:30:00.000Z', '2026-06-02T18:00:00.000Z', 'done', 'client_internal_canale77', 'Canale77', 'Workflow Know-how', 5, 'Aggiunte skill know-how di progetto. Spostate skill know-how fuori dal progetto per centralizzazione globale.', 'Axel Fleureau', '["github-real","2026-06-02","canale77","knowhow","cleanup"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-02T11:30:00.000Z', '2026-06-02T18:00:00.000Z', NULL),
  ('task_axel_ext3_20260602_dico', 'org_demo_righello', 'project_internal_dico_online_site', 'mem_axel_wearerighello', '2026-06-02 - DICO know-how playbook cleanup', 'Playbook know-how sviluppo spostato fuori dal progetto.', 'done', 'low', 30, 30, '2026-06-02T18:00:00.000Z', '2026-06-02T12:00:00.000Z', '2026-06-02T18:00:00.000Z', 'done', 'client_internal_dico_online', 'DICO Online', 'Workflow Know-how', 5, 'Aggiunto playbook know-how sviluppo. Spostato playbook know-how fuori dal progetto per centralizzazione globale.', 'Axel Fleureau', '["github-real","2026-06-02","dico-online","knowhow","cleanup"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-02T12:00:00.000Z', '2026-06-02T18:00:00.000Z', NULL),
  ('task_axel_ext3_20260602_obs', 'org_demo_righello', 'project_internal_obs_padel_stream_overlay', 'mem_axel_wearerighello', '2026-06-02 - OBS Padel know-how repository cleanup', 'Playbook sviluppo spostato fuori dal repository progetto.', 'done', 'low', 30, 30, '2026-06-02T18:00:00.000Z', '2026-06-02T12:30:00.000Z', '2026-06-02T18:00:00.000Z', 'done', 'client_internal_obs_padel', 'OBS Padel Stream Overlay', 'Workflow Know-how', 5, 'Aggiunto playbook know-how sviluppo. Spostato playbook know-how fuori dal repository progetto.', 'Axel Fleureau', '["github-real","2026-06-02","obs-padel","knowhow","cleanup"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-02T12:30:00.000Z', '2026-06-02T18:00:00.000Z', NULL),
  ('task_axel_ext3_20260602_scale', 'org_demo_righello', 'project_internal_scale_site', 'mem_axel_wearerighello', '2026-06-02 - Scale reusable web production know-how', 'Skill web production, indice know-how e quality gates per SEO, design, motion e sicurezza.', 'done', 'medium', 60, 60, '2026-06-02T18:00:00.000Z', '2026-06-02T13:00:00.000Z', '2026-06-02T18:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Knowledge Base / SEO', 7, 'Aggiunte skill riusabili di web production know-how. Generalizzato indice know-how sviluppo. Documentate skill su design system, mobile SEO/readability, motion/performance, SEO multilingua/AI search, quality gates, sicurezza/deploy e abuso controls.', 'Axel Fleureau', '["github-real","2026-06-02","scale-site","knowhow","seo","security"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-02T13:00:00.000Z', '2026-06-02T18:00:00.000Z', NULL),

  ('task_axel_ext3_20260603_portopiccolo', 'org_demo_righello', 'project_internal_portopiccolo', 'mem_axel_wearerighello', '2026-06-03 - Portopiccolo Guesty endpoint separation and booking fallback UX', 'Endpoint listing/booking, listing approvate, quote fallback, area ospite e route backend Cloudflare.', 'done', 'urgent', 90, 90, '2026-06-03T09:36:00.000Z', '2026-06-03T07:00:00.000Z', '2026-06-03T09:36:00.000Z', 'done', 'client_rig_ppap', 'Portopiccolo', 'Guesty Booking / Backend API', 9, 'Separati endpoint/API Guesty per listing e booking. Limitate listing Guesty pubbliche agli appartamenti approvati. Evitato che errori quote blocchino richieste booking. Gestiti reservation code fallback in Area Ospite. Migliorata UX richiesta fallback in Area Ospite. Aggiornati flussi checkout, conferma e area ospite. Rafforzate route backend Guesty e API Cloudflare/functions. Aggiornata UI nav/footer/accessi per area ospite e proprietari.', 'Axel Fleureau', '["github-real","2026-06-03","portopiccolo","guesty","booking","cloudflare"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-03T07:00:00.000Z', '2026-06-03T09:36:00.000Z', NULL),
  ('task_axel_ext3_20260603_revolut', 'org_demo_righello', 'project_internal_revolut_crypto_scalper', 'mem_axel_wearerighello', '2026-06-03 - Revolut wallet fill reconciliation and defensive derisk triggers', 'Riconciliazione wallet buy fills, risk-off reset, trim losses e derisk macro negativo.', 'done', 'urgent', 75, 75, '2026-06-03T09:36:00.000Z', '2026-06-03T07:30:00.000Z', '2026-06-03T09:36:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Trading Automation / Risk-off', 8, 'Riparata riconciliazione fill buy basata su wallet. Triggerato derisk difensivo su reset risk-off. Attivato derisk loser su qualsiasi regime risk-off. Attivato derisk su stance architect trim losses. Tagliati loser materiali in modalita defensive. Attivato derisk durante macro negativa difensiva.', 'Axel Fleureau', '["github-real","2026-06-03","revolut","wallet","derisk","risk-off"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-03T07:30:00.000Z', '2026-06-03T09:36:00.000Z', NULL),
  ('task_axel_ext3_20260603_solero', 'org_demo_righello', 'project_internal_solero_sport_village', 'mem_axel_wearerighello', '2026-06-03 - Solero cross-device hero scroll and mobile video source', 'Altezza hero desktop reale, video mobile e motion cross-device.', 'done', 'high', 50, 50, '2026-06-03T09:36:00.000Z', '2026-06-03T08:00:00.000Z', '2026-06-03T09:36:00.000Z', 'done', 'client_rig_ssvo', 'Solero Sport Village', 'Frontend / Hero Performance', 7, 'Usata altezza scroll hero desktop reale. Migliorata sorgente video hero mobile. Rafforzata gestione motion hero cross-device. Continuato tuning hero scroll mobile/desktop e recovery.', 'Axel Fleureau', '["github-real","2026-06-03","solero","hero","mobile-video","scroll"]', '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-03T08:00:00.000Z', '2026-06-03T09:36:00.000Z', NULL)
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
  AND id LIKE 'task_axel_ext3_2026%'
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

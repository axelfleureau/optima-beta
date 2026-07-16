-- Idempotent GitHub activity import for Axel Fleureau.
-- Period: 2026-07-14 17:26 -> 2026-07-16 11:01 Europe/Rome.
-- Source: verified GitHub operational activity supplied by Axel.
-- Scope: 59 commits across 9 active repositories.
-- Policy: import only the post-2026-07-14 17:26 work block. Existing
-- 2026-07-14 entries through 17:26 are left untouched and this seed adds the
-- evening delta plus 2026-07-15/16 activity.

PRAGMA foreign_keys = ON;

INSERT INTO clients (id, organization_id, name, email, company, status, created_at, updated_at)
VALUES
  ('client_internal_righello_ops', 'org_demo_righello', 'Righello', NULL, 'Righello', 'active', '2026-05-22T08:00:00.000Z', CURRENT_TIMESTAMP),
  ('client_internal_canale77', 'org_demo_righello', 'Canale77', NULL, 'Canale77', 'active', '2026-06-11T08:00:00.000Z', CURRENT_TIMESTAMP),
  ('client_internal_dico_online', 'org_demo_righello', 'DICO Online', NULL, 'DICO Online', 'active', '2026-06-11T08:00:00.000Z', CURRENT_TIMESTAMP),
  ('client_rig_ssvo', 'org_demo_righello', 'Solero Sport Village', NULL, 'APOLLO 2000 SRL', 'active', '2026-05-22T08:00:00.000Z', CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  company = excluded.company,
  status = excluded.status,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO projects (id, organization_id, client_id, name, status, budget_cents, starts_at, due_at, created_at, updated_at)
VALUES
  ('project_internal_optima_video_node', 'org_demo_righello', 'client_internal_righello_ops', 'Optima Video Node', 'active', 0, '2026-07-14T17:26:00.000Z', '2026-12-31T18:00:00.000Z', '2026-07-14T17:26:00.000Z', CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  client_id = excluded.client_id,
  name = excluded.name,
  status = excluded.status,
  updated_at = CURRENT_TIMESTAMP;

INSERT OR IGNORE INTO project_members (project_id, member_id, organization_id, role)
VALUES
  ('project_internal_canale77_ott_platform', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_optima', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_optima_video_node', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_dico_online_site', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_finestre_art', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_righello_site', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_revolut_crypto_scalper', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_solero_sport_village', 'mem_axel_wearerighello', 'org_demo_righello', 'owner');

INSERT INTO tasks (
  id, organization_id, project_id, assignee_member_id, title, description,
  status, priority, estimated_minutes, actual_minutes, due_at, created_at, updated_at,
  column_id, client_id, client_name, work_mode, type, score, rich_description, assignee_name,
  tags_json, attachments_json, comments_json, sub_items_json, created_by_member_id,
  assignment_status, assignment_requested_by_member_id, assignment_requested_at, assignment_responded_at
)
VALUES
  ('task_axel_github_20260714_20260716_canale77_tv_performance_native',
   'org_demo_righello', 'project_internal_canale77_ott_platform', 'mem_axel_wearerighello',
   '2026-07-14/16 - Canale77 Android TV, webOS e performance TV',
   'Sviluppo avanzato app OTT/Smart TV Canale77 con focus Android TV, webOS, performance e UX telecomando.',
   'done', 'urgent', 420, 420, '2026-07-16T11:01:00.000Z', '2026-07-14T17:26:00.000Z', CURRENT_TIMESTAMP,
   'done', 'client_internal_canale77', 'Canale77', 'remote', 'OTT Platform / Native TV / Performance', 10,
   'Attivita GitHub verificata: tastiera ricerca TV con tasti speciali/spazio/Cerca, web app dentro Android TV nativa, sigla 77+ con timeout/preroll/riproduzione completa, player nativo TextureView con comandi reali, anteprime video e secondo avvio, UX telecomando con focus/D-pad/scrim/navbar/hero/tile, continua a guardare, advertising non saltabile, memoria nativa ridotta da 232 MB a 98 MB PSS, webOS reale al posto del redirect, CORS e culling card da 13 a 59 fps.',
   'Axel Fleureau', '["github-real","2026-07-14","2026-07-16","canale77","android-tv","webos","performance","remote"]', '[]', '[]', '[]',
   'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-07-14T17:26:00.000Z', '2026-07-16T11:01:00.000Z'),
  ('task_axel_github_20260714_20260716_optima_video_review_module',
   'org_demo_righello', 'project_internal_optima', 'mem_axel_wearerighello',
   '2026-07-14/16 - Optima Video Review nativo',
   'Realizzazione modulo Video Review nativo dentro Optima.',
   'done', 'urgent', 360, 360, '2026-07-16T11:01:00.000Z', '2026-07-14T18:00:00.000Z', CURRENT_TIMESTAMP,
   'done', 'client_internal_righello_ops', 'Righello', 'remote', 'Video Review / Product / Backend', 10,
   'Attivita GitHub verificata: seed attivita GitHub Axel fino al 14 luglio, modulo Video Review dashboard, ingest da nodo esterno con URL byte firmati, dettaglio tranche con player/marker/export EDL, review room cliente con approvazione/revisione e marker, board SMM, player adattivo 9:16 e dimensioni reali, schema collaboratori/visibilita, note modifica cliccabili con seek al timecode, upload versione revisionata v2 e UI allineata allo stile Optima.',
   'Axel Fleureau', '["github-real","2026-07-14","2026-07-16","optima-beta","video-review","dashboard","api","remote"]', '[]', '[]', '[]',
   'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-07-14T18:00:00.000Z', '2026-07-16T11:01:00.000Z'),
  ('task_axel_github_20260714_20260716_optima_video_node_init',
   'org_demo_righello', 'project_internal_optima_video_node', 'mem_axel_wearerighello',
   '2026-07-14/16 - Optima Video Node',
   'Inizializzazione nodo byte esterno per modulo Video Review Optima.',
   'done', 'high', 180, 180, '2026-07-16T11:01:00.000Z', '2026-07-15T09:00:00.000Z', CURRENT_TIMESTAMP,
   'done', 'client_internal_righello_ops', 'Righello', 'remote', 'Video Pipeline / Node / Infrastructure', 9,
   'Attivita GitHub verificata: creato repository optima-video-node, struttura Next/Node per clienti, batch, review room, board SMM e API video, endpoint Optima per import clienti, creazione progetto e stato integrazione, servizi launchd/tunnel, script go-live Cloudflare ed endpoint thumbnail firmato /v/thumb per card compatte.',
   'Axel Fleureau', '["github-real","2026-07-15","2026-07-16","optima-video-node","video-review","cloudflare","remote"]', '[]', '[]', '[]',
   'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-07-15T09:00:00.000Z', '2026-07-16T11:01:00.000Z'),
  ('task_axel_github_20260714_20260716_dico_v3_golive_root',
   'org_demo_righello', 'project_internal_dico_online_site', 'mem_axel_wearerighello',
   '2026-07-14/16 - DICO v3 go-live root e referenze Comuni',
   'Completamento revisione DICO v3, go-live root e arricchimento referenze Comuni.',
   'done', 'high', 150, 150, '2026-07-16T11:01:00.000Z', '2026-07-15T10:00:00.000Z', CURRENT_TIMESTAMP,
   'done', 'client_internal_dico_online', 'DICO Online', 'remote', 'Frontend / SEO / Cloudflare', 9,
   'Attivita GitHub verificata: feedback Sabina 13/14/15 luglio, layout con soft lanyard, card magnetiche e fix responsive, promozione v3 a root, vera pagina 404 per eliminare soft 404, reverse proxy Cloudflare per legacy Aruba, referenze Comuni da dico.online, sezione Servizi unificata, blog verso v3 e video privacy-safe.',
   'Axel Fleureau', '["github-real","2026-07-15","2026-07-16","dico-online-site","go-live","cloudflare","seo","remote"]', '[]', '[]', '[]',
   'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-07-15T10:00:00.000Z', '2026-07-16T11:01:00.000Z'),
  ('task_axel_github_20260714_20260716_finestre_art_footer',
   'org_demo_righello', 'project_internal_finestre_art', 'mem_axel_wearerighello',
   '2026-07-14/16 - Finestre Art footer production-ready',
   'Rifinitura footer sito per produzione.',
   'done', 'medium', 45, 45, '2026-07-16T11:01:00.000Z', '2026-07-15T11:00:00.000Z', CURRENT_TIMESTAMP,
   'done', 'client_rig_finestre_art', 'Finestre Art', 'remote', 'Frontend / UI UX / Branding', 8,
   'Attivita GitHub verificata: rivisto footer in ottica production-ready, bilanciati contenuti, struttura e presentazione finale del layout con deployment production registrato.',
   'Axel Fleureau', '["github-real","2026-07-15","finestre-art","footer","ui-ux","remote"]', '[]', '[]', '[]',
   'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-07-15T11:00:00.000Z', '2026-07-16T11:01:00.000Z'),
  ('task_axel_github_20260714_20260716_righello_site_photo_spotlight',
   'org_demo_righello', 'project_internal_righello_site', 'mem_axel_wearerighello',
   '2026-07-14/16 - Righello Site Photo Spotlight',
   'Aggiunta sezione fotografica immersiva nella pagina progetti.',
   'done', 'medium', 60, 60, '2026-07-16T11:01:00.000Z', '2026-07-15T12:00:00.000Z', CURRENT_TIMESTAMP,
   'done', 'client_internal_righello_ops', 'Righello', 'remote', 'Frontend / Portfolio / UI UX', 8,
   'Attivita GitHub verificata: nuova sezione PhotoSpotlightShowcase, integrazione nella pagina progetti e aggiornamento struttura visuale per valorizzare lavori fotografici. Criticita aperta: CI/CD GitHub fallita, deployment production registrato.',
   'Axel Fleureau', '["github-real","2026-07-15","righello-site","photo-spotlight","portfolio","remote"]', '[]', '[]', '[]',
   'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-07-15T12:00:00.000Z', '2026-07-16T11:01:00.000Z'),
  ('task_axel_github_20260714_20260716_revolut_cash_rich_buy_guard',
   'org_demo_righello', 'project_internal_revolut_crypto_scalper', 'mem_axel_wearerighello',
   '2026-07-14/16 - Revolut cash-rich buy guard',
   'Ottimizzazione buy guard e gestione cash-rich nel motore trading.',
   'done', 'high', 60, 60, '2026-07-16T11:01:00.000Z', '2026-07-15T13:00:00.000Z', CURRENT_TIMESTAMP,
   'done', 'client_internal_righello_ops', 'Righello', 'remote', 'Trading Automation / Risk / Testing', 8,
   'Attivita GitHub verificata: aumentata size buy speculativa in condizioni cash-rich, consentiti scale-in su forza relativa protetta, mantenuta significativita acquisti cash-rich con profit lock attivo e aggiornati test buy guard.',
   'Axel Fleureau', '["github-real","2026-07-15","revolut-crypto-scalper","cash-rich","buy-guard","remote"]', '[]', '[]', '[]',
   'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-07-15T13:00:00.000Z', '2026-07-16T11:01:00.000Z'),
  ('task_axel_github_20260714_20260716_solero_source_delivery',
   'org_demo_righello', 'project_internal_solero_sport_village', 'mem_axel_wearerighello',
   '2026-07-14/16 - Solero repository sorgente',
   'Caricamento repository sorgente Solero Sport Village.',
   'done', 'medium', 90, 90, '2026-07-16T11:01:00.000Z', '2026-07-15T14:00:00.000Z', CURRENT_TIMESTAMP,
   'done', 'client_rig_ssvo', 'Solero Sport Village', 'remote', 'Delivery / Source Repository', 8,
   'Attivita GitHub verificata: creato repository sorgente dedicato, caricato codice applicativo client/server, asset, componenti admin, immagini, configurazioni e documentazione tecnica.',
   'Axel Fleureau', '["github-real","2026-07-15","solero-sport-village","source-repository","delivery","remote"]', '[]', '[]', '[]',
   'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-07-15T14:00:00.000Z', '2026-07-16T11:01:00.000Z'),
  ('task_axel_github_20260714_20260716_solero_delivery_package',
   'org_demo_righello', 'project_internal_solero_sport_village', 'mem_axel_wearerighello',
   '2026-07-14/16 - Solero repository delivery',
   'Caricamento repository delivery Solero Sport Village.',
   'done', 'medium', 90, 90, '2026-07-16T11:01:00.000Z', '2026-07-15T15:00:00.000Z', CURRENT_TIMESTAMP,
   'done', 'client_rig_ssvo', 'Solero Sport Village', 'remote', 'Delivery / Package Repository', 8,
   'Attivita GitHub verificata: creato repository delivery separato, caricato pacchetto applicativo con asset, PDF/menu, immagini generate e sorgenti, predisposta base consegnabile con struttura client/server e configurazioni.',
   'Axel Fleureau', '["github-real","2026-07-15","solero-sport-village","delivery-repository","assets","remote"]', '[]', '[]', '[]',
   'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-07-15T15:00:00.000Z', '2026-07-16T11:01:00.000Z')
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
  updated_at = CURRENT_TIMESTAMP,
  column_id = excluded.column_id,
  client_id = excluded.client_id,
  client_name = excluded.client_name,
  work_mode = excluded.work_mode,
  type = excluded.type,
  score = excluded.score,
  rich_description = excluded.rich_description,
  assignee_name = excluded.assignee_name,
  tags_json = excluded.tags_json,
  assignment_status = excluded.assignment_status,
  assignment_requested_by_member_id = excluded.assignment_requested_by_member_id,
  assignment_requested_at = excluded.assignment_requested_at,
  assignment_responded_at = excluded.assignment_responded_at;

INSERT INTO time_entries (
  id, organization_id, member_id, task_id, project_id, client_id, entry_date,
  minutes, billable, note, work_mode, review_status, submitted_at, submitted_by_member_id,
  reviewed_at, reviewed_by_member_id, created_at, updated_at
)
VALUES
  ('time_axel_github_20260714_canale77_tv_performance_native_delta', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260714_20260716_canale77_tv_performance_native', 'project_internal_canale77_ott_platform', 'client_internal_canale77', '2026-07-14', 120, 1, 'Consuntivo GitHub verificato post 17:26: Android TV nativa, player e sigla 77+.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260715_canale77_tv_performance_native', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260714_20260716_canale77_tv_performance_native', 'project_internal_canale77_ott_platform', 'client_internal_canale77', '2026-07-15', 240, 1, 'Consuntivo GitHub verificato: webOS reale, CORS, focus TV e performance card culling.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260716_canale77_tv_performance_native', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260714_20260716_canale77_tv_performance_native', 'project_internal_canale77_ott_platform', 'client_internal_canale77', '2026-07-16', 60, 1, 'Consuntivo GitHub verificato: rifiniture continua a guardare e advertising rendiconto.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260714_optima_video_review_module_delta', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260714_20260716_optima_video_review_module', 'project_internal_optima', 'client_internal_righello_ops', '2026-07-14', 120, 1, 'Consuntivo GitHub verificato post 17:26: modulo Video Review e schema iniziale.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260715_optima_video_review_module', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260714_20260716_optima_video_review_module', 'project_internal_optima', 'client_internal_righello_ops', '2026-07-15', 180, 1, 'Consuntivo GitHub verificato: ingest firmato, tranche, player, marker, review room e board SMM.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260716_optima_video_review_module', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260714_20260716_optima_video_review_module', 'project_internal_optima', 'client_internal_righello_ops', '2026-07-16', 60, 1, 'Consuntivo GitHub verificato: seek timecode, upload v2 e UI coerente Optima.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260715_optima_video_node_init', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260714_20260716_optima_video_node_init', 'project_internal_optima_video_node', 'client_internal_righello_ops', '2026-07-15', 120, 1, 'Consuntivo GitHub verificato: repo optima-video-node, API video e integrazione Optima.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260716_optima_video_node_init', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260714_20260716_optima_video_node_init', 'project_internal_optima_video_node', 'client_internal_righello_ops', '2026-07-16', 60, 1, 'Consuntivo GitHub verificato: launchd/tunnel, go-live Cloudflare e thumbnail firmato.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260715_dico_v3_golive_root', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260714_20260716_dico_v3_golive_root', 'project_internal_dico_online_site', 'client_internal_dico_online', '2026-07-15', 90, 1, 'Consuntivo GitHub verificato: feedback Sabina, v3 root, 404 e reverse proxy Cloudflare.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260716_dico_v3_golive_root', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260714_20260716_dico_v3_golive_root', 'project_internal_dico_online_site', 'client_internal_dico_online', '2026-07-16', 60, 1, 'Consuntivo GitHub verificato: referenze Comuni, servizi unificati, blog v3 e video privacy-safe.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260715_finestre_art_footer', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260714_20260716_finestre_art_footer', 'project_internal_finestre_art', 'client_rig_finestre_art', '2026-07-15', 45, 1, 'Consuntivo GitHub verificato: footer production-ready e bilanciamento contenuti.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260715_righello_site_photo_spotlight', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260714_20260716_righello_site_photo_spotlight', 'project_internal_righello_site', 'client_internal_righello_ops', '2026-07-15', 60, 1, 'Consuntivo GitHub verificato: PhotoSpotlightShowcase e pagina progetti.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260715_revolut_cash_rich_buy_guard', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260714_20260716_revolut_cash_rich_buy_guard', 'project_internal_revolut_crypto_scalper', 'client_internal_righello_ops', '2026-07-15', 60, 1, 'Consuntivo GitHub verificato: cash-rich buy guard, scale-in e test aggiornati.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260715_solero_source_delivery', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260714_20260716_solero_source_delivery', 'project_internal_solero_sport_village', 'client_rig_ssvo', '2026-07-15', 90, 1, 'Consuntivo GitHub verificato: repository sorgente Solero con client/server, asset e docs.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260715_solero_delivery_package', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260714_20260716_solero_delivery_package', 'project_internal_solero_sport_village', 'client_rig_ssvo', '2026-07-15', 90, 1, 'Consuntivo GitHub verificato: repository delivery Solero con pacchetto e configurazioni.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  task_id = excluded.task_id,
  project_id = excluded.project_id,
  client_id = excluded.client_id,
  entry_date = excluded.entry_date,
  minutes = excluded.minutes,
  billable = excluded.billable,
  note = excluded.note,
  work_mode = excluded.work_mode,
  review_status = excluded.review_status,
  submitted_at = excluded.submitted_at,
  submitted_by_member_id = excluded.submitted_by_member_id,
  reviewed_at = excluded.reviewed_at,
  reviewed_by_member_id = excluded.reviewed_by_member_id,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO work_days (
  id, organization_id, member_id, entry_date, check_in_at, check_out_at,
  status, absence_reason, notes, review_status, submitted_at, submitted_by_member_id,
  reviewed_at, reviewed_by_member_id, created_at, updated_at
)
VALUES
  ('workday_axel_github_20260714_normalized', 'org_demo_righello', 'mem_axel_wearerighello', '2026-07-14', '2026-07-14T08:00:00+02:00', '2026-07-14T23:30:00+02:00', 'closed', NULL, 'Normalizzato da consuntivi GitHub verificati: 840 minuti task di valore sul 14 luglio, includendo il blocco post 17:26.', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('workday_axel_github_20260715_normalized', 'org_demo_righello', 'mem_axel_wearerighello', '2026-07-15', '2026-07-15T08:00:00+02:00', '2026-07-15T22:30:00+02:00', 'closed', NULL, 'Normalizzato da consuntivi GitHub verificati: 975 minuti task di valore sul 15 luglio.', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('workday_axel_github_20260716_normalized', 'org_demo_righello', 'mem_axel_wearerighello', '2026-07-16', '2026-07-16T08:00:00+02:00', '2026-07-16T11:01:00+02:00', 'closed', NULL, 'Normalizzato da consuntivi GitHub verificati fino alle 11:01: 240 minuti task di valore sul 16 luglio.', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(organization_id, member_id, entry_date) DO UPDATE SET
  check_in_at = excluded.check_in_at,
  check_out_at = excluded.check_out_at,
  status = excluded.status,
  absence_reason = excluded.absence_reason,
  notes = excluded.notes,
  review_status = excluded.review_status,
  submitted_at = excluded.submitted_at,
  submitted_by_member_id = excluded.submitted_by_member_id,
  reviewed_at = excluded.reviewed_at,
  reviewed_by_member_id = excluded.reviewed_by_member_id,
  updated_at = CURRENT_TIMESTAMP;

UPDATE tasks
SET actual_minutes = (
  SELECT COALESCE(SUM(time_entries.minutes), 0)
  FROM time_entries
  WHERE time_entries.organization_id = tasks.organization_id
    AND time_entries.task_id = tasks.id
),
updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND assignee_member_id = 'mem_axel_wearerighello'
  AND id LIKE 'task_axel_github_20260714_20260716_%';

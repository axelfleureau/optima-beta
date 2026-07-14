-- Idempotent GitHub activity import for Axel Fleureau.
-- Period: 2026-07-07 18:55 -> 2026-07-14 17:26 Europe/Rome.
-- Source: verified GitHub operational activity supplied by Axel.
-- Scope: about 306 commits across 12 active repositories.
-- Policy: import only the post-2026-07-07 18:55 work block. Existing
-- 2026-07-04 -> 2026-07-07 imports are left untouched to avoid duplicates.

PRAGMA foreign_keys = ON;

INSERT INTO clients (id, organization_id, name, email, company, status, created_at, updated_at)
VALUES
  ('client_internal_righello_ops', 'org_demo_righello', 'Righello', NULL, 'Righello', 'active', '2026-05-22T08:00:00.000Z', CURRENT_TIMESTAMP),
  ('client_internal_canale77', 'org_demo_righello', 'Canale77', NULL, 'Canale77', 'active', '2026-06-11T08:00:00.000Z', CURRENT_TIMESTAMP),
  ('client_internal_dico_online', 'org_demo_righello', 'DICO Online', NULL, 'DICO Online', 'active', '2026-06-11T08:00:00.000Z', CURRENT_TIMESTAMP),
  ('client_internal_gusto_raffinato', 'org_demo_righello', 'Gusto Raffinato', NULL, 'Gusto Raffinato', 'active', '2026-06-11T08:00:00.000Z', CURRENT_TIMESTAMP),
  ('client_rig_ssvo', 'org_demo_righello', 'Solero Sport Village', NULL, 'APOLLO 2000 SRL', 'active', '2026-05-22T08:00:00.000Z', CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  company = excluded.company,
  status = excluded.status,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO projects (id, organization_id, client_id, name, status, budget_cents, starts_at, due_at, created_at, updated_at)
VALUES
  ('project_internal_google_review_reply_bot', 'org_demo_righello', 'client_internal_righello_ops', 'Google Review Reply Bot', 'active', 0, '2026-07-07T18:55:00.000Z', '2026-12-31T18:00:00.000Z', '2026-07-07T18:55:00.000Z', CURRENT_TIMESTAMP),
  ('project_internal_righello_match_suite', 'org_demo_righello', 'client_internal_righello_ops', 'Righello Match Suite', 'active', 0, '2026-07-07T18:55:00.000Z', '2026-12-31T18:00:00.000Z', '2026-07-07T18:55:00.000Z', CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  client_id = excluded.client_id,
  name = excluded.name,
  status = excluded.status,
  updated_at = CURRENT_TIMESTAMP;

INSERT OR IGNORE INTO project_members (project_id, member_id, organization_id, role)
VALUES
  ('project_internal_canale77_ott_platform', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_optima', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_whatsapp_gateway', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_revolut_crypto_scalper', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_solero_sport_village', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_dico_online_site', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_gusto_raffinato', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_google_review_reply_bot', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_tetha', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_lumis_photo_publisher', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_righello_site', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_righello_match_suite', 'mem_axel_wearerighello', 'org_demo_righello', 'owner');

INSERT INTO tasks (
  id, organization_id, project_id, assignee_member_id, title, description,
  status, priority, estimated_minutes, actual_minutes, due_at, created_at, updated_at,
  column_id, client_id, client_name, work_mode, type, score, rich_description, assignee_name,
  tags_json, attachments_json, comments_json, sub_items_json, created_by_member_id,
  assignment_status, assignment_requested_by_member_id, assignment_requested_at, assignment_responded_at
)
VALUES
  ('task_axel_github_20260707_20260714_canale77_ott_tv_android',
   'org_demo_righello', 'project_internal_canale77_ott_platform', 'mem_axel_wearerighello',
   '2026-07-07/14 - Canale77 OTT, Smart TV e Android TV',
   'Sviluppo e stabilizzazione piattaforma OTT, Smart TV e Android TV Canale77.',
   'done', 'urgent', 480, 480, '2026-07-14T17:26:00.000Z', '2026-07-08T08:00:00.000Z', CURRENT_TIMESTAMP,
   'done', 'client_internal_canale77', 'Canale77', 'remote', 'OTT Platform / Smart TV', 10,
   'Attivita GitHub verificata: wrapper Android TV nativo, catalogo VOD con pipeline FTP, normalizzazione contenuti calcio/TG/rubriche, navigazione D-pad, restyle UI TV con tile moderne, focus glow, rail e poster, continue watching, fix layout 1280px/overflow/scaling Android TV e pulsante Cerca per tastierino TV.',
   'Axel Fleureau', '["github-real","2026-07-08","2026-07-14","canale77","ott","android-tv","smart-tv","remote"]', '[]', '[]', '[]',
   'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-07-08T08:00:00.000Z', '2026-07-14T17:26:00.000Z'),
  ('task_axel_github_20260707_20260714_optima_rapportini_ai_presenze',
   'org_demo_righello', 'project_internal_optima', 'mem_axel_wearerighello',
   '2026-07-07/14 - Optima rapportini, AI, presenze e integrazioni',
   'Evoluzione gestionale Optima su rapportini, AI, presenze e integrazioni operative.',
   'done', 'urgent', 420, 420, '2026-07-14T17:26:00.000Z', '2026-07-08T09:00:00.000Z', CURRENT_TIMESTAMP,
   'done', 'client_internal_righello_ops', 'Righello', 'remote', 'Product / Backend / AI', 10,
   'Attivita GitHub verificata: composer richieste modifica nei rapportini, review mini-entry, salvataggi idempotenti, bust cache, hardening ruoli/scrittura, deep link task da email workspace, permessi utenti interni su clienti tenant, fallback stream chat AI, refresh sessioni scadute ed endpoint integrazione video-review con service token e create-project.',
   'Axel Fleureau', '["github-real","2026-07-08","2026-07-14","optima-beta","rapportini","ai","presenze","integrations","remote"]', '[]', '[]', '[]',
   'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-07-08T09:00:00.000Z', '2026-07-14T17:26:00.000Z'),
  ('task_axel_github_20260707_20260714_whatsapp_graph_router_smoke',
   'org_demo_righello', 'project_internal_whatsapp_gateway', 'mem_axel_wearerighello',
   '2026-07-07/14 - WhatsApp bot, Graph memory e smoke produzione',
   'Hardening bot WhatsApp civico con Graph memory, router locale e smoke di produzione.',
   'done', 'urgent', 480, 480, '2026-07-14T17:26:00.000Z', '2026-07-08T10:00:00.000Z', CURRENT_TIMESTAMP,
   'done', 'client_internal_righello_ops', 'Righello', 'remote', 'AI Automation / Backend', 10,
   'Attivita GitHub verificata: diagnostica graph miss, alias eventi STAR A PN, readiness inbound primaria, auto-heal OpenWA shadow, esclusione contatti sintetici, safe production webhook smoke, gestione cache eventi stale, cooldown TTS/voice/weather fallback, hot path Qwen/local router, dedupe candidati inbound, risposte funzionari pubblici da memoria graph e stress suite attivita recenti.',
   'Axel Fleureau', '["github-real","2026-07-08","2026-07-14","whatsapp-web-js","graph-memory","qwen","smoke","remote"]', '[]', '[]', '[]',
   'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-07-08T10:00:00.000Z', '2026-07-14T17:26:00.000Z'),
  ('task_axel_github_20260707_20260714_revolut_cash_risk_monitor',
   'org_demo_righello', 'project_internal_revolut_crypto_scalper', 'mem_axel_wearerighello',
   '2026-07-07/14 - Revolut cash deploy, risk guard e opportunity monitor',
   'Raffinamento motore trading crypto su impiego liquidita, risk guard e monitor opportunita.',
   'done', 'urgent', 600, 600, '2026-07-14T17:26:00.000Z', '2026-07-08T11:00:00.000Z', CURRENT_TIMESTAMP,
   'done', 'client_internal_righello_ops', 'Righello', 'remote', 'Trading Automation / Risk', 10,
   'Attivita GitHub verificata: cash probe e scale-in per wallet cash-rich, top-up major controllati, pullback/grid probe/ladder BTC, profit lock, derisk, residual exit, protezione precisione ordini token piccoli, scanner AI esteso in high-cash, daily opportunity monitor e test su buy guard, risk engine, market scanner e news sentiment.',
   'Axel Fleureau', '["github-real","2026-07-08","2026-07-14","revolut-crypto-scalper","risk","cash-deploy","opportunity-monitor","remote"]', '[]', '[]', '[]',
   'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-07-08T11:00:00.000Z', '2026-07-14T17:26:00.000Z'),
  ('task_axel_github_20260707_20260714_solero_admin_delivery',
   'org_demo_righello', 'project_internal_solero_sport_village', 'mem_axel_wearerighello',
   '2026-07-07/14 - Solero backend/admin e handoff sorgente',
   'Consolidamento backend/admin Solero e preparazione delivery sorgente.',
   'done', 'high', 300, 300, '2026-07-14T17:26:00.000Z', '2026-07-09T08:30:00.000Z', CURRENT_TIMESTAMP,
   'done', 'client_rig_ssvo', 'Solero Sport Village', 'remote', 'Backend / Admin / Email', 9,
   'Attivita GitHub verificata: controllo eliminazione news, reset password admin, chiarimento campi SEO homepage, gallery e lead admin, policy origin socket piu restrittiva, drag and drop immagini news, redeploy SMTP, bundle email serverless, layout email lead, cancellazione richieste lead, template email mobile, pulizia asset tecnici e handoff deploy.',
   'Axel Fleureau', '["github-real","2026-07-09","2026-07-14","solero-sport-village","admin","email","delivery","remote"]', '[]', '[]', '[]',
   'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-07-09T08:30:00.000Z', '2026-07-14T17:26:00.000Z'),
  ('task_axel_github_20260707_20260714_dico_v3_landing_comuni',
   'org_demo_righello', 'project_internal_dico_online_site', 'mem_axel_wearerighello',
   '2026-07-07/14 - DICO v3 e landing Comuni',
   'Revisione estesa DICO v3 e landing Comuni.',
   'done', 'urgent', 420, 420, '2026-07-14T17:26:00.000Z', '2026-07-08T12:00:00.000Z', CURRENT_TIMESTAMP,
   'done', 'client_internal_dico_online', 'DICO Online', 'remote', 'Frontend / UI UX / Branding', 10,
   'Attivita GitHub verificata: audit responsive, icon set cliente, fix cursor glow, link legacy critici, route marketing, feedback cliente, navigazione e canali, hero/copy mobile, logo CCD, menu mobile, video metodo Luciano, foto reali SwissTransfer, spacing sezioni, CTA subscribe Comuni, fix overlap mobile e riuso foto reali dico.online per hero landing.',
   'Axel Fleureau', '["github-real","2026-07-08","2026-07-14","dico-online-site","dico-v3","landing-comuni","ui-ux","remote"]', '[]', '[]', '[]',
   'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-07-08T12:00:00.000Z', '2026-07-14T17:26:00.000Z'),
  ('task_axel_github_20260707_20260714_gusto_ipad_table_vision',
   'org_demo_righello', 'project_internal_gusto_raffinato', 'mem_axel_wearerighello',
   '2026-07-07/14 - Gusto iPad Restaurant OS e table vision',
   'Operativita iPad restaurant OS e table vision scanner.',
   'done', 'high', 240, 240, '2026-07-14T17:26:00.000Z', '2026-07-10T10:00:00.000Z', CURRENT_TIMESTAMP,
   'done', 'client_internal_gusto_raffinato', 'Gusto Raffinato', 'remote', 'Mobile / AI Vision / UX', 9,
   'Attivita GitHub verificata: gestione menu iPad, diagnostica scanner gateway, puntamento gateway live, build TestFlight, documentazione runtime table vision, visualizzazione candidati YOLO deboli, floor map source of truth, invio floor map al gateway, matching detection/floor map e console piano sala piu operativa.',
   'Axel Fleureau', '["github-real","2026-07-10","2026-07-14","gusto-raffinato","ipad","table-vision","testflight","remote"]', '[]', '[]', '[]',
   'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-07-10T10:00:00.000Z', '2026-07-14T17:26:00.000Z'),
  ('task_axel_github_20260707_20260714_google_review_reply_bot',
   'org_demo_righello', 'project_internal_google_review_reply_bot', 'mem_axel_wearerighello',
   '2026-07-07/14 - Google Review Reply Bot',
   'Inizializzazione bot AI per risposte Google review con readiness e control plane.',
   'done', 'medium', 120, 120, '2026-07-14T17:26:00.000Z', '2026-07-12T09:00:00.000Z', CURRENT_TIMESTAMP,
   'done', 'client_internal_righello_ops', 'Righello', 'remote', 'AI Automation / Backend', 8,
   'Attivita GitHub verificata: boilerplate progetto, hardening API/runtime, readiness lanes, review room control plane, memoria Graphify, policy bot, script check configurazione/segreti, documentazione OAuth/deploy VPS e workflow CI.',
   'Axel Fleureau', '["github-real","2026-07-12","2026-07-14","google-review-reply-bot","ai","readiness","remote"]', '[]', '[]', '[]',
   'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-07-12T09:00:00.000Z', '2026-07-14T17:26:00.000Z'),
  ('task_axel_github_20260707_20260714_tetha_telegram_codex_pr',
   'org_demo_righello', 'project_internal_tetha', 'mem_axel_wearerighello',
   '2026-07-07/14 - Tetha PR Telegram assistant e Codex reasoning',
   'Avanzamento PR Telegram assistant con Codex reasoning e readiness AI.',
   'done', 'high', 180, 180, '2026-07-14T17:26:00.000Z', '2026-07-10T11:00:00.000Z', CURRENT_TIMESTAMP,
   'done', 'client_internal_righello_ops', 'Righello', 'remote', 'AI Assistant / Telegram / Codex', 9,
   'Attivita GitHub verificata: quote assistant condiviso su Telegram, sanitizzazione callback queue, rimozione dipendenza indice Firestore, contratto operational brain nei prompt AI, eval reale Codex per intelligence Telegram, readiness gate con eval, normalizzazione argomenti Codex exec, priorita evidenze ed esposizione reasoning Codex nelle risposte intake.',
   'Axel Fleureau', '["github-real","2026-07-10","2026-07-14","tetha","telegram","codex","pr-1","remote"]', '[]', '[]', '[]',
   'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-07-10T11:00:00.000Z', '2026-07-14T17:26:00.000Z'),
  ('task_axel_github_20260707_20260714_lumis_photo_delivery',
   'org_demo_righello', 'project_internal_lumis_photo_publisher', 'mem_axel_wearerighello',
   '2026-07-07/14 - Lumis consegna foto originali',
   'Miglioramento flusso consegna foto originali Lumis.',
   'done', 'medium', 120, 120, '2026-07-14T17:26:00.000Z', '2026-07-12T10:00:00.000Z', CURRENT_TIMESTAMP,
   'done', 'client_internal_righello_ops', 'Righello', 'remote', 'Backend / Cloudflare / Delivery', 8,
   'Attivita GitHub verificata: fix delivery foto originali, endpoint resend ordine, piano owner interno Lumis, append upload queue e aggiornamento configurazione Cloudflare Worker.',
   'Axel Fleureau', '["github-real","2026-07-12","2026-07-14","photo-publisher-righello","lumis","cloudflare","remote"]', '[]', '[]', '[]',
   'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-07-12T10:00:00.000Z', '2026-07-14T17:26:00.000Z'),
  ('task_axel_github_20260707_20260714_righello_site_email_system',
   'org_demo_righello', 'project_internal_righello_site', 'mem_axel_wearerighello',
   '2026-07-07/14 - Righello Site sistema email',
   'Redesign sistema email Righello.',
   'done', 'medium', 150, 150, '2026-07-14T17:26:00.000Z', '2026-07-11T10:00:00.000Z', CURRENT_TIMESTAMP,
   'done', 'client_internal_righello_ops', 'Righello', 'remote', 'Email Design / Branding', 8,
   'Attivita GitHub verificata: template email piu raffinati, fix layout riepilogo, rimozione accent rail header, sistema visuale email, supporto tema chiaro/scuro, icone hosted SVG/PNG e aggiornamento test template. Criticita aperta: CI/CD fallito su alcuni run, con deployment production registrati.',
   'Axel Fleureau', '["github-real","2026-07-11","2026-07-14","righello-site","email","branding","remote"]', '[]', '[]', '[]',
   'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-07-11T10:00:00.000Z', '2026-07-14T17:26:00.000Z'),
  ('task_axel_github_20260707_20260714_righello_match_suite_init',
   'org_demo_righello', 'project_internal_righello_match_suite', 'mem_axel_wearerighello',
   '2026-07-07/14 - Righello Match Suite palmare e AI roster',
   'Inizializzazione suite palmare cronisti, AI roster e VPS.',
   'done', 'medium', 150, 150, '2026-07-14T17:26:00.000Z', '2026-07-13T11:00:00.000Z', CURRENT_TIMESTAMP,
   'done', 'client_internal_righello_ops', 'Righello', 'remote', 'Sports Production / AI / VPS', 8,
   'Attivita GitHub verificata: release iniziale, cleanup capitani roster, import conoscenza TuttoCampo, cache AI team per stato partita, sync manuale camera e lineup state, script VPS/palmare e servizi systemd.',
   'Axel Fleureau', '["github-real","2026-07-13","2026-07-14","righello-match-suite","ai-roster","vps","remote"]', '[]', '[]', '[]',
   'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-07-13T11:00:00.000Z', '2026-07-14T17:26:00.000Z')
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
  ('time_axel_github_20260708_canale77_ott_tv_android', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_canale77_ott_tv_android', 'project_internal_canale77_ott_platform', 'client_internal_canale77', '2026-07-08', 180, 1, 'Consuntivo GitHub verificato: Android TV, catalogo VOD e navigazione D-pad.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260709_canale77_ott_tv_android', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_canale77_ott_tv_android', 'project_internal_canale77_ott_platform', 'client_internal_canale77', '2026-07-09', 120, 1, 'Consuntivo GitHub verificato: UI TV, focus glow, rail e poster.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260711_canale77_ott_tv_android', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_canale77_ott_tv_android', 'project_internal_canale77_ott_platform', 'client_internal_canale77', '2026-07-11', 120, 1, 'Consuntivo GitHub verificato: continue watching, layout 1280px e ricerca TV.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260714_canale77_ott_tv_android', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_canale77_ott_tv_android', 'project_internal_canale77_ott_platform', 'client_internal_canale77', '2026-07-14', 60, 1, 'Consuntivo GitHub verificato: stabilizzazione finale Smart TV.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260708_optima_rapportini_ai_presenze', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_optima_rapportini_ai_presenze', 'project_internal_optima', 'client_internal_righello_ops', '2026-07-08', 120, 1, 'Consuntivo GitHub verificato: rapportini, review mini-entry e richieste modifica.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260710_optima_rapportini_ai_presenze', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_optima_rapportini_ai_presenze', 'project_internal_optima', 'client_internal_righello_ops', '2026-07-10', 90, 1, 'Consuntivo GitHub verificato: idempotenza, cache bust e permessi ruoli.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260713_optima_rapportini_ai_presenze', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_optima_rapportini_ai_presenze', 'project_internal_optima', 'client_internal_righello_ops', '2026-07-13', 120, 1, 'Consuntivo GitHub verificato: deep link email, stream AI e refresh sessioni.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260714_optima_rapportini_ai_presenze', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_optima_rapportini_ai_presenze', 'project_internal_optima', 'client_internal_righello_ops', '2026-07-14', 90, 1, 'Consuntivo GitHub verificato: video-review service token e create-project.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260708_whatsapp_graph_router_smoke', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_whatsapp_graph_router_smoke', 'project_internal_whatsapp_gateway', 'client_internal_righello_ops', '2026-07-08', 120, 1, 'Consuntivo GitHub verificato: graph miss, alias eventi e readiness inbound.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260709_whatsapp_graph_router_smoke', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_whatsapp_graph_router_smoke', 'project_internal_whatsapp_gateway', 'client_internal_righello_ops', '2026-07-09', 120, 1, 'Consuntivo GitHub verificato: auto-heal OpenWA e smoke webhook produzione.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260710_whatsapp_graph_router_smoke', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_whatsapp_graph_router_smoke', 'project_internal_whatsapp_gateway', 'client_internal_righello_ops', '2026-07-10', 90, 1, 'Consuntivo GitHub verificato: router Qwen/local e dedupe inbound.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260711_whatsapp_graph_router_smoke', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_whatsapp_graph_router_smoke', 'project_internal_whatsapp_gateway', 'client_internal_righello_ops', '2026-07-11', 90, 1, 'Consuntivo GitHub verificato: risposte funzionari e stress suite.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260714_whatsapp_graph_router_smoke', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_whatsapp_graph_router_smoke', 'project_internal_whatsapp_gateway', 'client_internal_righello_ops', '2026-07-14', 60, 1, 'Consuntivo GitHub verificato: cooldown e cache eventi stale.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260708_revolut_cash_risk_monitor', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_revolut_cash_risk_monitor', 'project_internal_revolut_crypto_scalper', 'client_internal_righello_ops', '2026-07-08', 180, 1, 'Consuntivo GitHub verificato: cash probe, scale-in e top-up major.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260709_revolut_cash_risk_monitor', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_revolut_cash_risk_monitor', 'project_internal_revolut_crypto_scalper', 'client_internal_righello_ops', '2026-07-09', 180, 1, 'Consuntivo GitHub verificato: pullback, grid probe e ladder BTC.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260710_revolut_cash_risk_monitor', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_revolut_cash_risk_monitor', 'project_internal_revolut_crypto_scalper', 'client_internal_righello_ops', '2026-07-10', 120, 1, 'Consuntivo GitHub verificato: profit lock, derisk e residual exit.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260712_revolut_cash_risk_monitor', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_revolut_cash_risk_monitor', 'project_internal_revolut_crypto_scalper', 'client_internal_righello_ops', '2026-07-12', 120, 1, 'Consuntivo GitHub verificato: opportunity monitor e test risk/scanner.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260709_solero_admin_delivery', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_solero_admin_delivery', 'project_internal_solero_sport_village', 'client_rig_ssvo', '2026-07-09', 60, 1, 'Consuntivo GitHub verificato: admin news, reset password e SEO homepage.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260711_solero_admin_delivery', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_solero_admin_delivery', 'project_internal_solero_sport_village', 'client_rig_ssvo', '2026-07-11', 90, 1, 'Consuntivo GitHub verificato: gallery, lead admin e socket origin policy.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260712_solero_admin_delivery', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_solero_admin_delivery', 'project_internal_solero_sport_village', 'client_rig_ssvo', '2026-07-12', 90, 1, 'Consuntivo GitHub verificato: email serverless, template mobile e handoff deploy.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260714_solero_admin_delivery', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_solero_admin_delivery', 'project_internal_solero_sport_village', 'client_rig_ssvo', '2026-07-14', 60, 1, 'Consuntivo GitHub verificato: pulizia asset e delivery sorgente.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260708_dico_v3_landing_comuni', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_dico_v3_landing_comuni', 'project_internal_dico_online_site', 'client_internal_dico_online', '2026-07-08', 60, 1, 'Consuntivo GitHub verificato: audit responsive e icon set cliente.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260709_dico_v3_landing_comuni', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_dico_v3_landing_comuni', 'project_internal_dico_online_site', 'client_internal_dico_online', '2026-07-09', 120, 1, 'Consuntivo GitHub verificato: hero, copy mobile, navigazione e canali.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260710_dico_v3_landing_comuni', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_dico_v3_landing_comuni', 'project_internal_dico_online_site', 'client_internal_dico_online', '2026-07-10', 90, 1, 'Consuntivo GitHub verificato: foto reali, spacing sezioni e CTA Comuni.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260712_dico_v3_landing_comuni', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_dico_v3_landing_comuni', 'project_internal_dico_online_site', 'client_internal_dico_online', '2026-07-12', 90, 1, 'Consuntivo GitHub verificato: fix overlap mobile e hero landing.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260714_dico_v3_landing_comuni', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_dico_v3_landing_comuni', 'project_internal_dico_online_site', 'client_internal_dico_online', '2026-07-14', 60, 1, 'Consuntivo GitHub verificato: rifiniture DICO v3 e landing Comuni.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260710_gusto_ipad_table_vision', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_gusto_ipad_table_vision', 'project_internal_gusto_raffinato', 'client_internal_gusto_raffinato', '2026-07-10', 60, 1, 'Consuntivo GitHub verificato: menu iPad, gateway live e TestFlight.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260711_gusto_ipad_table_vision', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_gusto_ipad_table_vision', 'project_internal_gusto_raffinato', 'client_internal_gusto_raffinato', '2026-07-11', 60, 1, 'Consuntivo GitHub verificato: YOLO candidates e floor map source of truth.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260713_gusto_ipad_table_vision', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_gusto_ipad_table_vision', 'project_internal_gusto_raffinato', 'client_internal_gusto_raffinato', '2026-07-13', 60, 1, 'Consuntivo GitHub verificato: matching detection/floor map e console sala.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260714_gusto_ipad_table_vision', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_gusto_ipad_table_vision', 'project_internal_gusto_raffinato', 'client_internal_gusto_raffinato', '2026-07-14', 60, 1, 'Consuntivo GitHub verificato: runtime table vision e test.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260712_google_review_reply_bot', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_google_review_reply_bot', 'project_internal_google_review_reply_bot', 'client_internal_righello_ops', '2026-07-12', 60, 1, 'Consuntivo GitHub verificato: boilerplate, API/runtime e review room.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260713_google_review_reply_bot', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_google_review_reply_bot', 'project_internal_google_review_reply_bot', 'client_internal_righello_ops', '2026-07-13', 60, 1, 'Consuntivo GitHub verificato: Graphify memory, policy bot, docs OAuth/deploy e CI.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260710_tetha_telegram_codex_pr', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_tetha_telegram_codex_pr', 'project_internal_tetha', 'client_internal_righello_ops', '2026-07-10', 60, 1, 'Consuntivo GitHub verificato: Telegram quote assistant e callback queue.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260713_tetha_telegram_codex_pr', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_tetha_telegram_codex_pr', 'project_internal_tetha', 'client_internal_righello_ops', '2026-07-13', 60, 1, 'Consuntivo GitHub verificato: operational brain prompts e Codex eval.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260714_tetha_telegram_codex_pr', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_tetha_telegram_codex_pr', 'project_internal_tetha', 'client_internal_righello_ops', '2026-07-14', 60, 1, 'Consuntivo GitHub verificato: readiness gate, argomenti Codex exec e reasoning intake.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260712_lumis_photo_delivery', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_lumis_photo_delivery', 'project_internal_lumis_photo_publisher', 'client_internal_righello_ops', '2026-07-12', 60, 1, 'Consuntivo GitHub verificato: delivery foto originali e resend ordine.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260714_lumis_photo_delivery', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_lumis_photo_delivery', 'project_internal_lumis_photo_publisher', 'client_internal_righello_ops', '2026-07-14', 60, 1, 'Consuntivo GitHub verificato: upload queue e configurazione Cloudflare Worker.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260711_righello_site_email_system', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_righello_site_email_system', 'project_internal_righello_site', 'client_internal_righello_ops', '2026-07-11', 60, 1, 'Consuntivo GitHub verificato: redesign template email e layout riepilogo.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260713_righello_site_email_system', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_righello_site_email_system', 'project_internal_righello_site', 'client_internal_righello_ops', '2026-07-13', 60, 1, 'Consuntivo GitHub verificato: tema chiaro/scuro e icone hosted.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260714_righello_site_email_system', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_righello_site_email_system', 'project_internal_righello_site', 'client_internal_righello_ops', '2026-07-14', 30, 1, 'Consuntivo GitHub verificato: test template e note CI/CD.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260713_righello_match_suite_init', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_righello_match_suite_init', 'project_internal_righello_match_suite', 'client_internal_righello_ops', '2026-07-13', 90, 1, 'Consuntivo GitHub verificato: suite palmare, AI roster e cache team.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('time_axel_github_20260714_righello_match_suite_init', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260707_20260714_righello_match_suite_init', 'project_internal_righello_match_suite', 'client_internal_righello_ops', '2026-07-14', 60, 1, 'Consuntivo GitHub verificato: VPS/palmare, lineup state e systemd services.', 'remote', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
  ('workday_axel_github_20260708_normalized', 'org_demo_righello', 'mem_axel_wearerighello', '2026-07-08', '2026-07-08T07:45:00+02:00', '2026-07-08T22:15:00+02:00', 'closed', NULL, 'Normalizzato da consuntivi GitHub verificati: 660 minuti task di valore sul 8 luglio.', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('workday_axel_github_20260709_normalized', 'org_demo_righello', 'mem_axel_wearerighello', '2026-07-09', '2026-07-09T08:00:00+02:00', '2026-07-09T22:00:00+02:00', 'closed', NULL, 'Normalizzato da consuntivi GitHub verificati: 600 minuti task di valore sul 9 luglio.', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('workday_axel_github_20260710_normalized', 'org_demo_righello', 'mem_axel_wearerighello', '2026-07-10', '2026-07-10T08:10:00+02:00', '2026-07-10T21:30:00+02:00', 'closed', NULL, 'Normalizzato da consuntivi GitHub verificati: 510 minuti task di valore sul 10 luglio.', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('workday_axel_github_20260711_normalized', 'org_demo_righello', 'mem_axel_wearerighello', '2026-07-11', '2026-07-11T08:30:00+02:00', '2026-07-11T19:30:00+02:00', 'closed', NULL, 'Normalizzato da consuntivi GitHub verificati: 420 minuti task di valore sul 11 luglio.', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('workday_axel_github_20260712_normalized', 'org_demo_righello', 'mem_axel_wearerighello', '2026-07-12', '2026-07-12T08:45:00+02:00', '2026-07-12T20:00:00+02:00', 'closed', NULL, 'Normalizzato da consuntivi GitHub verificati: 420 minuti task di valore sul 12 luglio.', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('workday_axel_github_20260713_normalized', 'org_demo_righello', 'mem_axel_wearerighello', '2026-07-13', '2026-07-13T08:00:00+02:00', '2026-07-13T21:45:00+02:00', 'closed', NULL, 'Normalizzato da consuntivi GitHub verificati: 450 minuti task di valore sul 13 luglio.', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('workday_axel_github_20260714_normalized', 'org_demo_righello', 'mem_axel_wearerighello', '2026-07-14', '2026-07-14T08:00:00+02:00', '2026-07-14T17:26:00+02:00', 'closed', NULL, 'Normalizzato da consuntivi GitHub verificati fino alle 17:26: 600 minuti task di valore sul 14 luglio.', 'approved', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, 'mem_axel_wearerighello', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
  AND id LIKE 'task_axel_github_20260707_20260714_%';

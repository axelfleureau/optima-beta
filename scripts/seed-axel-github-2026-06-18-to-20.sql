-- Idempotent GitHub activity import for Axel Fleureau.
-- Period: 2026-06-18 07:02 to 2026-06-20 07:37 Europe/Rome.
-- Source: verified GitHub activity summary supplied by Axel.
-- Scope: 722 commits on main branches across 11 repositories, plus Tetha PR #1 delta.
-- Workload policy: high-volume CTO/founder report distributed across 18/19/20 June without impossible single-day totals.
-- Net workload added: 24h total, distributed as 8h on 2026-06-18, 12h on 2026-06-19 and 4h on 2026-06-20.

INSERT OR IGNORE INTO project_members (project_id, member_id, organization_id, role)
VALUES
  ('project_internal_gusto_raffinato', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_portopiccolo', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_obs_padel_stream_overlay', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_whatsapp_gateway', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_finestre_art', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_optima', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_dico_online_site', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_canale77_ott_platform', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_revolut_crypto_scalper', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_righello_site', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_lumis_photo_publisher', 'mem_axel_wearerighello', 'org_demo_righello', 'owner'),
  ('project_internal_tetha', 'mem_axel_wearerighello', 'org_demo_righello', 'owner');

INSERT INTO tasks (
  id, organization_id, project_id, assignee_member_id, title, description,
  status, priority, estimated_minutes, actual_minutes, due_at, created_at, updated_at,
  column_id, client_id, client_name, type, score, rich_description,
  assignee_name, tags_json, attachments_json, comments_json, sub_items_json,
  created_by_member_id, assignment_status, assignment_requested_by_member_id,
  assignment_requested_at, assignment_responded_at
)
VALUES
  (
    'task_axel_github_20260618_20260620_gusto_mobile_restaurant_os_table_vision',
    'org_demo_righello', 'project_internal_gusto_raffinato', 'mem_axel_wearerighello',
    '2026-06-18/20 - Gusto mobile consumer, Restaurant OS e table vision',
    'Avanzamento mobile consumer, iPad Restaurant OS, booking, mappe, table vision, ingredient graph e TestFlight.',
    'done', 'urgent', 180, 180, '2026-06-20T05:37:00.000Z', '2026-06-18T07:02:00.000Z', CURRENT_TIMESTAMP,
    'done', 'client_internal_gusto_raffinato', 'Gusto Raffinato', 'Mobile / Restaurant OS', 10,
    'Attivita GitHub verificata su Gusto Raffinato: 136 commit. Forte avanzamento mobile consumer e Restaurant OS iPad; stabilizzazione booking, preferiti, recensioni, azioni dettaglio ristorante e mappe; table vision con policy anti-allucinazione, gating temporale, riduzione falsi positivi e session reducer; ingredient graph adattivo, allergeni e fonti dati esterne; scanner tavoli collegato a floor operations; bump TestFlight e rifinitura UI consumer/iPad.',
    'Axel Fleureau', '["github-real","2026-06-18","2026-06-20","gusto-raffinato","mobile","restaurant-os","table-vision","testflight"]',
    '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-18T07:02:00.000Z', '2026-06-20T05:37:00.000Z'
  ),
  (
    'task_axel_github_20260618_20260620_portopiccolo_finance_art_living_guesty',
    'org_demo_righello', 'project_internal_portopiccolo', 'mem_axel_wearerighello',
    '2026-06-18/20 - Portopiccolo finance production, Art of Living e Guesty',
    'Finance production, macOS companion app, Quadra/ZKB, security governance, Art of Living admin e checkout Guesty.',
    'done', 'urgent', 240, 240, '2026-06-20T05:37:00.000Z', '2026-06-18T07:30:00.000Z', CURRENT_TIMESTAMP,
    'done', 'client_rig_ppap', 'Portopiccolo Apartments', 'Hospitality / Finance ops', 10,
    'Attivita GitHub verificata su Portopiccolo: 154 commit. Sviluppo finance production con dashboard admin, readiness gates, evidence pack, preflight, go-live pack, Quadra runner, ZKB validation e property rules; companion app macOS finance con LaunchAgent/Keychain/doctor; token approver, revoca token e audit auth; Art of Living admin media upload/editor UX/scroll/SEO; hardening Guesty checkout, fallback GuestyPay, sanitizzazione amenities, indexing pack e workflow audit-images completati.',
    'Axel Fleureau', '["github-real","2026-06-18","2026-06-20","portopiccolo","finance","macos","guesty","art-of-living","security"]',
    '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-18T07:30:00.000Z', '2026-06-20T05:37:00.000Z'
  ),
  (
    'task_axel_github_20260618_20260620_obs_davinci_agent_production',
    'org_demo_righello', 'project_internal_obs_padel_stream_overlay', 'mem_axel_wearerighello',
    '2026-06-18/20 - OBS DaVinci agent, deferred production e overlay',
    'Pipeline DaVinci Resolve/Mac Studio, Mac agent SwiftUI, bridge Resolve, production UI e marker/export automation.',
    'done', 'urgent', 240, 240, '2026-06-20T05:37:00.000Z', '2026-06-18T08:00:00.000Z', CURRENT_TIMESTAMP,
    'done', 'client_internal_righello_ops', 'Righello', 'Live production / DaVinci', 10,
    'Attivita GitHub verificata su OBS Padel Stream Overlay: 169 commit. Evoluzione pipeline DaVinci Resolve/Mac Studio per produzione differita; Mac agent SwiftUI, bridge DaVinci, packaging app, LaunchAgent, doctor e readiness tests; Production UI con goal markers, timeline map, deferred rehearsal e operator brief; integrazione marker/overlay in Resolve adapter, automazione export package e hardening replay/live goal actions.',
    'Axel Fleureau', '["github-real","2026-06-18","2026-06-20","obs-padel","davinci","macos-agent","production-ui","overlay"]',
    '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-18T08:00:00.000Z', '2026-06-20T05:37:00.000Z'
  ),
  (
    'task_axel_github_20260618_20260620_whatsapp_civic_openwa_voice',
    'org_demo_righello', 'project_internal_whatsapp_gateway', 'mem_axel_wearerighello',
    '2026-06-18/20 - WhatsApp bot civico, voice e production readiness',
    'Routing civico, voice transcription/replies, OpenWA readiness, stress/canary suite e Obsidian graph export.',
    'done', 'high', 180, 180, '2026-06-20T05:37:00.000Z', '2026-06-18T08:30:00.000Z', CURRENT_TIMESTAMP,
    'done', 'client_internal_righello_ops', 'Righello', 'AI operations / WhatsApp', 9,
    'Attivita GitHub verificata su whatsapp-web.js: 96 commit. Rafforzamento bot civico WhatsApp per produzione: routing intent civici, eventi, cinema, meteo, CIE, housing e domande istituzionali; voice message transcription e voice replies automatiche; OpenWA readiness/cutover/inbound diagnostics/missed inbound recovery; stress suite, canary suite, production full gate, security scan, readiness dashboard; esportazione graph Obsidian e rimozione fallback OpenAI runtime.',
    'Axel Fleureau', '["github-real","2026-06-18","2026-06-20","whatsapp-web-js","civic-bot","voice","openwa","readiness"]',
    '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-18T08:30:00.000Z', '2026-06-20T05:37:00.000Z'
  ),
  (
    'task_axel_github_20260618_20260620_finestre_art_quote_seo_security',
    'org_demo_righello', 'project_internal_finestre_art', 'mem_axel_wearerighello',
    '2026-06-18/20 - Atelier Finestre Art configuratore, SEO e sicurezza',
    'Pricing runtime, import CSV, preventivi auditabili, pagine prodotto, CSP, SEO e performance.',
    'done', 'high', 120, 120, '2026-06-20T05:37:00.000Z', '2026-06-18T09:00:00.000Z', CURRENT_TIMESTAMP,
    'done', 'client_rig_finestre_art', 'Finestre Art', 'Frontend / Quote system', 9,
    'Attivita GitHub verificata su Atelier Finestre Art: 62 commit. Ottimizzazione sito e configuratore preventivi: pricing catalog runtime, parser/import CSV, snapshot preventivi e breakdown auditabile; hardening form contatti, template email, API runtime, lead admin e sicurezza; miglioramento pagine finestre, porte, tapparelle, scuri, comfort protection, servizi, contatti e home; rimozione overhead GSAP; CSP produzione, breadcrumb, hreflang, metadata SEO e supporto opzioni a metro quadro.',
    'Axel Fleureau', '["github-real","2026-06-18","2026-06-20","finestre-art","quote-system","seo","security","performance"]',
    '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-18T09:00:00.000Z', '2026-06-20T05:37:00.000Z'
  ),
  (
    'task_axel_github_20260618_20260620_optima_connector_telegram_graph',
    'org_demo_righello', 'project_internal_optima', 'mem_axel_wearerighello',
    '2026-06-18/20 - Optima connector MCP, Telegram bot e graph assistant',
    'Redesign control room agent connector/MCP, readiness dashboard, Telegram agentico e graph context assistant.',
    'done', 'urgent', 120, 120, '2026-06-20T05:37:00.000Z', '2026-06-18T09:30:00.000Z', CURRENT_TIMESTAMP,
    'done', 'client_internal_righello_ops', 'Righello', 'Gestionale interno / Agentic OS', 10,
    'Attivita GitHub verificata su Optima Beta: 45 commit. Redesign e semplificazione control room agent connector/MCP; wizard MCP, selection UX, readiness dashboard, verification gate e stati operativi; workflow bot Telegram agentico, readiness endpoint, reminders cron, media group attachments e onboarding chat non autorizzate; graph index nel contesto assistant; command bar, workspace client visibility, client fallback e UX quote/PDF.',
    'Axel Fleureau', '["github-real","2026-06-18","2026-06-20","optima-beta","mcp","telegram-bot","agentic-os","graph"]',
    '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-18T09:30:00.000Z', '2026-06-20T05:37:00.000Z'
  ),
  (
    'task_axel_github_20260618_20260620_dico_landing_mega_menu',
    'org_demo_righello', 'project_internal_dico_online_site', 'mem_axel_wearerighello',
    '2026-06-18/20 - DICO landing, mega menu e referenze SEO',
    'Landing DICO con mega menu, nav fissa, motion layer, contenuti versione 2, referenze e risorse.',
    'done', 'medium', 75, 75, '2026-06-20T05:37:00.000Z', '2026-06-18T10:00:00.000Z', CURRENT_TIMESTAMP,
    'done', 'client_internal_dico_online', 'DICO Online', 'Frontend / Institutional website', 8,
    'Attivita GitHub verificata su DICO Online Site: 17 commit. Evoluzione landing con mega menu, nav fissa, motion layer e copy reale; allineamento contenuti versione 2 e inventario sito corrente; pagine referenze interne generate e risorse dedicate; rifinitura brand navy DICO, Poppins, screenshot, territory settings, slider foto comuni e correzioni overflow/scrolling nav.',
    'Axel Fleureau', '["github-real","2026-06-18","2026-06-20","dico-online","landing","mega-menu","seo","referenze"]',
    '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-18T10:00:00.000Z', '2026-06-20T05:37:00.000Z'
  ),
  (
    'task_axel_github_20260618_20260620_canale77_hls_vps_tv_ui',
    'org_demo_righello', 'project_internal_canale77_ott_platform', 'mem_axel_wearerighello',
    '2026-06-18/20 - Canale77 HLS/VPS pipeline e TV UI',
    'Pipeline HLS/VPS, ingest, CDN/cache, worker HLS, dropbox ingest, cleanup retention e UI TV.',
    'done', 'high', 90, 90, '2026-06-20T05:37:00.000Z', '2026-06-18T10:30:00.000Z', CURRENT_TIMESTAMP,
    'done', 'client_internal_canale77', 'Canale77', 'OTT Platform / HLS', 8,
    'Attivita GitHub verificata su Canale77 OTT Platform: 24 commit. Costruzione pipeline HLS/VPS per ingest, smoke test, deploy e verifica CDN/cache; worker HLS, dropbox ingest, cleanup retention, origin self-test e readiness report; hardening runtime Node VPS, header HLS e SFTP upload user; rifinitura UI TV con hero/header, navbar, rail stile Netflix e focus spacing.',
    'Axel Fleureau', '["github-real","2026-06-18","2026-06-20","canale77","hls","vps","ott","tv-ui"]',
    '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-18T10:30:00.000Z', '2026-06-20T05:37:00.000Z'
  ),
  (
    'task_axel_github_20260618_20260620_revolut_risk_scouts',
    'org_demo_righello', 'project_internal_revolut_crypto_scalper', 'mem_axel_wearerighello',
    '2026-06-18/20 - Revolut buy gates, rebound scouts e Codex circuit breaker',
    'Concentration trader, macro rebound scout, shallow rebound repair, early momentum scout e buy guard tests.',
    'done', 'high', 60, 60, '2026-06-20T05:37:00.000Z', '2026-06-18T11:00:00.000Z', CURRENT_TIMESTAMP,
    'done', 'client_internal_righello_ops', 'Righello', 'Trading automation / Risk gates', 8,
    'Attivita GitHub verificata su Revolut Crypto Scalper: 13 commit. Aggiunta gate di acquisto concentration trader, macro rebound scout, shallow rebound repair e early momentum scout; migliorata pulizia posizioni perdenti/crowded loser e cooldown derisk persistente; aggiunto circuit breaker Codex CLI; rafforzati test buy guards e runtime Codex CLI.',
    'Axel Fleureau', '["github-real","2026-06-18","2026-06-20","revolut-crypto-scalper","risk-gates","scouts","codex-cli"]',
    '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-18T11:00:00.000Z', '2026-06-20T05:37:00.000Z'
  ),
  (
    'task_axel_github_20260618_20260620_righello_site_ci_buffr',
    'org_demo_righello', 'project_internal_righello_site', 'mem_axel_wearerighello',
    '2026-06-18/20 - Righello Site CI deployability e BUFFR scroll demo',
    'Fix CI deployability, package lock, BUFFR scroll demo responsiveness e sprite immagine.',
    'done', 'medium', 45, 45, '2026-06-20T05:37:00.000Z', '2026-06-18T11:30:00.000Z', CURRENT_TIMESTAMP,
    'done', 'client_internal_righello_ops', 'Righello', 'Website / CI', 6,
    'Attivita GitHub verificata su Righello Site: 4 commit. Fix CI deployability mentre resta debito lint, sync package lock per CI, miglioramento animazione BUFFR scroll demo e responsiveness, aggiunta sprite immagine BUFFR scroll. Criticita: workflow CI/CD ancora fallito sui push del periodo.',
    'Axel Fleureau', '["github-real","2026-06-18","2026-06-20","righello-site","ci","buffr","lint-debt"]',
    '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-18T11:30:00.000Z', '2026-06-20T05:37:00.000Z'
  ),
  (
    'task_axel_github_20260618_20260620_lumis_landing_story',
    'org_demo_righello', 'project_internal_lumis_photo_publisher', 'mem_axel_wearerighello',
    '2026-06-18/20 - Lumis landing story statica e visual asset',
    'Sostituzione scroll reveal landing con story statica e asset immagini dedicati.',
    'done', 'low', 30, 30, '2026-06-20T05:37:00.000Z', '2026-06-18T12:00:00.000Z', CURRENT_TIMESTAMP,
    'done', 'client_internal_righello_ops', 'Righello', 'Landing page / UI', 5,
    'Attivita GitHub verificata su Photo Publisher Righello / Lumis: 2 commit. Sostituzione scroll reveal landing con story statica, miglioramento visual landing story e asset immagini dedicati.',
    'Axel Fleureau', '["github-real","2026-06-18","2026-06-20","lumis","landing","visual-assets"]',
    '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-18T12:00:00.000Z', '2026-06-20T05:37:00.000Z'
  ),
  (
    'task_axel_github_20260618_20260620_tetha_telegram_secretary_pr',
    'org_demo_righello', 'project_internal_tetha', 'mem_axel_wearerighello',
    '2026-06-18/20 - Tetha PR Telegram secretary e document workspace',
    'Aggiornamento PR #1 con Telegram secretary, document classifier, memoria learning, worker Codex e evidence guards.',
    'done', 'high', 60, 60, '2026-06-20T05:37:00.000Z', '2026-06-18T12:30:00.000Z', CURRENT_TIMESTAMP,
    'done', 'client_internal_righello_ops', 'Righello', 'Agentic document workspace / Telegram', 8,
    'Attivita GitHub verificata su Tetha PR #1: 92 commit datati nel periodo, diff +17316/-242 rispetto all''ultimo commit gia rendicontato. Sviluppo Telegram secretary con intake documenti, classificazione PDF/immagini, conferme, review queue, archiviazione, reminder, allowed chats e bulk upload; Codex CLI come runtime primario per analisi documenti e worker Mac; memoria/learning per correzioni e preferenze archivio; smoke/stress/eval/readiness audit e worker launchd; evidence guards su date, riferimenti, document type e classificazioni critiche. PR ancora aperta.',
    'Axel Fleureau', '["github-real","2026-06-18","2026-06-20","tetha","pr-1","telegram-secretary","document-intelligence","codex-worker"]',
    '[]', '[]', '[]', 'mem_axel_wearerighello', 'accepted', 'mem_axel_wearerighello', '2026-06-18T12:30:00.000Z', '2026-06-20T05:37:00.000Z'
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
  updated_at = CURRENT_TIMESTAMP,
  column_id = excluded.column_id,
  client_id = excluded.client_id,
  client_name = excluded.client_name,
  type = excluded.type,
  score = excluded.score,
  rich_description = excluded.rich_description,
  assignee_name = excluded.assignee_name,
  tags_json = excluded.tags_json,
  assignment_status = excluded.assignment_status,
  assignment_responded_at = excluded.assignment_responded_at;

INSERT INTO time_entries (
  id, organization_id, member_id, task_id, project_id, entry_date,
  minutes, billable, note, created_at, updated_at, client_id
)
VALUES
  ('time_axel_github_20260618_gusto_mobile_restaurant_os_table_vision', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260618_20260620_gusto_mobile_restaurant_os_table_vision', 'project_internal_gusto_raffinato', '2026-06-18', 120, 1, 'Stima GitHub 18 giugno: Gusto mobile consumer, Restaurant OS, table vision e TestFlight.', '2026-06-18T18:00:00.000Z', CURRENT_TIMESTAMP, 'client_internal_gusto_raffinato'),
  ('time_axel_github_20260619_gusto_mobile_restaurant_os_table_vision', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260618_20260620_gusto_mobile_restaurant_os_table_vision', 'project_internal_gusto_raffinato', '2026-06-19', 60, 1, 'Stima GitHub 19 giugno: Gusto mappe, ingredient graph e scanner/floor operations.', '2026-06-19T18:00:00.000Z', CURRENT_TIMESTAMP, 'client_internal_gusto_raffinato'),
  ('time_axel_github_20260618_portopiccolo_finance_art_living_guesty', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260618_20260620_portopiccolo_finance_art_living_guesty', 'project_internal_portopiccolo', '2026-06-18', 120, 1, 'Stima GitHub 18 giugno: Portopiccolo finance production, macOS app e governance.', '2026-06-18T18:30:00.000Z', CURRENT_TIMESTAMP, 'client_rig_ppap'),
  ('time_axel_github_20260619_portopiccolo_finance_art_living_guesty', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260618_20260620_portopiccolo_finance_art_living_guesty', 'project_internal_portopiccolo', '2026-06-19', 120, 1, 'Stima GitHub 19 giugno: Portopiccolo Art of Living, Guesty checkout, SEO e audit-images.', '2026-06-19T18:30:00.000Z', CURRENT_TIMESTAMP, 'client_rig_ppap'),
  ('time_axel_github_20260618_obs_davinci_agent_production', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260618_20260620_obs_davinci_agent_production', 'project_internal_obs_padel_stream_overlay', '2026-06-18', 120, 1, 'Stima GitHub 18 giugno: OBS DaVinci Mac agent, bridge Resolve e packaging app.', '2026-06-18T19:00:00.000Z', CURRENT_TIMESTAMP, 'client_internal_righello_ops'),
  ('time_axel_github_20260619_obs_davinci_agent_production', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260618_20260620_obs_davinci_agent_production', 'project_internal_obs_padel_stream_overlay', '2026-06-19', 120, 1, 'Stima GitHub 19 giugno: OBS Production UI, marker, export package e replay/live hardening.', '2026-06-19T19:00:00.000Z', CURRENT_TIMESTAMP, 'client_internal_righello_ops'),
  ('time_axel_github_20260618_whatsapp_civic_openwa_voice', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260618_20260620_whatsapp_civic_openwa_voice', 'project_internal_whatsapp_gateway', '2026-06-18', 120, 1, 'Stima GitHub 18 giugno: WhatsApp bot civico, voice transcription e routing intent.', '2026-06-18T19:30:00.000Z', CURRENT_TIMESTAMP, 'client_internal_righello_ops'),
  ('time_axel_github_20260619_whatsapp_civic_openwa_voice', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260618_20260620_whatsapp_civic_openwa_voice', 'project_internal_whatsapp_gateway', '2026-06-19', 60, 1, 'Stima GitHub 19 giugno: WhatsApp OpenWA readiness, stress/canary suite e Obsidian graph export.', '2026-06-19T19:30:00.000Z', CURRENT_TIMESTAMP, 'client_internal_righello_ops'),
  ('time_axel_github_20260619_finestre_art_quote_seo_security', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260618_20260620_finestre_art_quote_seo_security', 'project_internal_finestre_art', '2026-06-19', 120, 1, 'Stima GitHub 19 giugno: Finestre Art configuratore preventivi, SEO, CSP e sicurezza produzione.', '2026-06-19T20:00:00.000Z', CURRENT_TIMESTAMP, 'client_rig_finestre_art'),
  ('time_axel_github_20260619_optima_connector_telegram_graph', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260618_20260620_optima_connector_telegram_graph', 'project_internal_optima', '2026-06-19', 120, 1, 'Stima GitHub 19 giugno: Optima control room MCP, Telegram bot agentico e graph assistant.', '2026-06-19T20:30:00.000Z', CURRENT_TIMESTAMP, 'client_internal_righello_ops'),
  ('time_axel_github_20260619_dico_landing_mega_menu', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260618_20260620_dico_landing_mega_menu', 'project_internal_dico_online_site', '2026-06-19', 75, 1, 'Stima GitHub 19 giugno: DICO landing, mega menu, referenze e overflow nav.', '2026-06-19T21:00:00.000Z', CURRENT_TIMESTAMP, 'client_internal_dico_online'),
  ('time_axel_github_20260619_canale77_hls_vps_tv_ui', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260618_20260620_canale77_hls_vps_tv_ui', 'project_internal_canale77_ott_platform', '2026-06-19', 45, 1, 'Stima GitHub 19 giugno: Canale77 HLS/VPS pipeline, ingest, CDN/cache e TV UI.', '2026-06-19T21:30:00.000Z', CURRENT_TIMESTAMP, 'client_internal_canale77'),
  ('time_axel_github_20260620_canale77_hls_vps_tv_ui', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260618_20260620_canale77_hls_vps_tv_ui', 'project_internal_canale77_ott_platform', '2026-06-20', 45, 1, 'Stima GitHub 20 giugno mattina: Canale77 HLS/VPS pipeline e verifica operativa TV UI.', '2026-06-20T05:45:00.000Z', CURRENT_TIMESTAMP, 'client_internal_canale77'),
  ('time_axel_github_20260620_revolut_risk_scouts', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260618_20260620_revolut_risk_scouts', 'project_internal_revolut_crypto_scalper', '2026-06-20', 60, 1, 'Stima GitHub 20 giugno mattina: Revolut buy gates, rebound scouts e Codex circuit breaker.', '2026-06-20T06:00:00.000Z', CURRENT_TIMESTAMP, 'client_internal_righello_ops'),
  ('time_axel_github_20260620_righello_site_ci_buffr', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260618_20260620_righello_site_ci_buffr', 'project_internal_righello_site', '2026-06-20', 45, 1, 'Stima GitHub 20 giugno mattina: Righello Site CI deployability e BUFFR scroll demo.', '2026-06-20T06:15:00.000Z', CURRENT_TIMESTAMP, 'client_internal_righello_ops'),
  ('time_axel_github_20260620_lumis_landing_story', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260618_20260620_lumis_landing_story', 'project_internal_lumis_photo_publisher', '2026-06-20', 30, 1, 'Stima GitHub 20 giugno mattina: Lumis landing story statica e asset immagini.', '2026-06-20T06:30:00.000Z', CURRENT_TIMESTAMP, 'client_internal_righello_ops'),
  ('time_axel_github_20260620_tetha_telegram_secretary_pr', 'org_demo_righello', 'mem_axel_wearerighello', 'task_axel_github_20260618_20260620_tetha_telegram_secretary_pr', 'project_internal_tetha', '2026-06-20', 60, 1, 'Stima GitHub 20 giugno mattina: Tetha PR #1 Telegram secretary, document classifier, Codex worker e evidence guards.', '2026-06-20T06:45:00.000Z', CURRENT_TIMESTAMP, 'client_internal_righello_ops')
ON CONFLICT(id) DO UPDATE SET
  task_id = excluded.task_id,
  project_id = excluded.project_id,
  entry_date = excluded.entry_date,
  minutes = excluded.minutes,
  billable = excluded.billable,
  note = excluded.note,
  updated_at = CURRENT_TIMESTAMP,
  client_id = excluded.client_id;

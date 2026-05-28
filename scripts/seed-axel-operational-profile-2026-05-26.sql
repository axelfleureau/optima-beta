-- Seed operativo Axel Fleureau / Righello.
-- Periodo: 2026-05-22 -> 2026-05-26 11:50 Europe/Rome.
-- Idempotente: rilanciabile, integra le differenze senza duplicare.

PRAGMA foreign_keys = ON;

INSERT INTO organizations (id, clerk_org_id, name, slug, status, created_at, updated_at)
VALUES ('org_demo_righello', NULL, 'Righello', 'righello', 'active', '2026-05-22T07:00:00.000Z', CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  slug = excluded.slug,
  status = excluded.status,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO members (
  id, organization_id, clerk_user_id, email, first_name, last_name, role,
  hourly_rate_cents, weekly_capacity_minutes, status, created_at, updated_at
) VALUES
('mem_axel_fleureau', 'org_demo_righello', 'invite:fleureau.axel@gmail.com', 'fleureau.axel@gmail.com', 'Axel', 'Fleureau', 'admin', 4500, 2100, 'invited', '2026-05-22T07:00:00.000Z', CURRENT_TIMESTAMP),
('mem_axel_wearerighello', 'org_demo_righello', 'invite:axel@wearerighello.com', 'axel@wearerighello.com', 'Axel', 'Fleureau', 'admin', 4500, 2100, 'invited', '2026-05-22T07:00:00.000Z', CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  organization_id = excluded.organization_id,
  email = excluded.email,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  role = excluded.role,
  hourly_rate_cents = excluded.hourly_rate_cents,
  weekly_capacity_minutes = excluded.weekly_capacity_minutes,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO clients (id, organization_id, name, email, company, status, created_at, updated_at)
VALUES
('client_internal_righello_ops', 'org_demo_righello', 'Righello', 'info@wearerighello.com', 'Righello', 'active', '2026-05-22T07:00:00.000Z', CURRENT_TIMESTAMP),
('client_rig_ssvo', 'org_demo_righello', 'Solero Sport Village', NULL, 'APOLLO 2000 SRL', 'active', '2026-05-22T07:00:00.000Z', CURRENT_TIMESTAMP),
('client_rig_ppap', 'org_demo_righello', 'Portopiccolo', NULL, 'Portopiccolo Apartments', 'active', '2026-05-22T07:00:00.000Z', CURRENT_TIMESTAMP),
('client_rig_finestre_art', 'org_demo_righello', 'Finestre Art', NULL, 'Atelier Finestre Art', 'active', '2026-05-22T07:00:00.000Z', CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  email = excluded.email,
  company = excluded.company,
  status = excluded.status,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO projects (id, organization_id, client_id, name, status, budget_cents, starts_at, due_at, created_at, updated_at)
VALUES
('project_internal_solero_sport_village', 'org_demo_righello', 'client_rig_ssvo', 'Solero Sport Village', 'active', 0, '2026-05-22T07:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-22T07:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_portopiccolo', 'org_demo_righello', 'client_rig_ppap', 'Portopiccolo', 'active', 0, '2026-05-22T07:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-22T07:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_finestre_art', 'org_demo_righello', 'client_rig_finestre_art', 'Finestre Art', 'active', 0, '2026-05-22T07:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-22T07:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_revolut_crypto_scalper', 'org_demo_righello', 'client_internal_righello_ops', 'Revolut Crypto Scalper', 'active', 0, '2026-05-23T07:00:00.000Z', '2026-06-15T18:00:00.000Z', '2026-05-23T07:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_optima', 'org_demo_righello', 'client_internal_righello_ops', 'Optima', 'active', 0, '2026-05-23T07:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-23T07:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_lumis_photo_publisher', 'org_demo_righello', 'client_internal_righello_ops', 'Lumis / Photo Publisher Righello', 'active', 0, '2026-05-23T07:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-23T07:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_buffr', 'org_demo_righello', 'client_internal_righello_ops', 'BUFFR', 'active', 0, '2026-05-23T07:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-23T07:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_morocco_tours', 'org_demo_righello', 'client_internal_righello_ops', 'Morocco Tours', 'active', 0, '2026-05-23T07:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-23T07:00:00.000Z', CURRENT_TIMESTAMP),
('project_internal_scale_site', 'org_demo_righello', 'client_internal_righello_ops', 'Scale Site', 'active', 0, '2026-05-25T07:00:00.000Z', '2026-06-30T18:00:00.000Z', '2026-05-25T07:00:00.000Z', CURRENT_TIMESTAMP)
ON CONFLICT(id) DO UPDATE SET
  client_id = excluded.client_id,
  name = excluded.name,
  status = excluded.status,
  due_at = excluded.due_at,
  updated_at = CURRENT_TIMESTAMP;

INSERT OR IGNORE INTO project_members (project_id, member_id, organization_id, role)
SELECT id, 'mem_axel_fleureau', organization_id, 'owner'
FROM projects
WHERE organization_id = 'org_demo_righello';

INSERT OR IGNORE INTO project_members (project_id, member_id, organization_id, role)
SELECT id, 'mem_axel_wearerighello', organization_id, 'owner'
FROM projects
WHERE organization_id = 'org_demo_righello';

INSERT INTO tasks (
  id, organization_id, project_id, assignee_member_id, title, description, status, priority,
  estimated_minutes, actual_minutes, due_at, created_at, updated_at, column_id, client_id,
  client_name, type, score, rich_description, assignee_name, tags_json, attachments_json,
  comments_json, sub_items_json, created_by_member_id, assignment_status,
  assignment_requested_by_member_id, assignment_requested_at, assignment_responded_at,
  assignment_rejection_reason
) VALUES
('task_axel_profile_20260522_solero', 'org_demo_righello', 'project_internal_solero_sport_village', 'mem_axel_fleureau', '2026-05-22 - Solero Sport Village delivery mobile e admin', 'Responsive mobile, admin media, audit contenuti, fallback, template tecnici e rifinitura visiva.', 'done', 'high', 240, 240, '2026-05-22T18:00:00.000Z', '2026-05-22T08:00:00.000Z', '2026-05-22T18:00:00.000Z', 'done', 'client_rig_ssvo', 'Solero Sport Village', 'Frontend / CMS', 9, 'Migliorata responsivita mobile della home gallery e della gallery tecnica. Sistemati hero, mosaic immagini e sezioni discipline. Completato flusso admin media, documenti e contenuti. Aggiunto audit contenuti. Introdotti fallback per servizi e discipline. Ottimizzati template sportivi e racchette. Rifinita palette, color grading home e asset Koala. PR codex/home-mobile-gallery mergeata.', 'Axel Fleureau', '["cto-profile","2026-05-22","solero","mobile","admin-cms"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-22T08:00:00.000Z', '2026-05-22T18:00:00.000Z', NULL),
('task_axel_profile_20260522_portopiccolo', 'org_demo_righello', 'project_internal_portopiccolo', 'mem_axel_fleureau', '2026-05-22 - Portopiccolo production readiness', 'Preparazione produzione con API serverless, env, sicurezza, asset e UX mobile.', 'done', 'high', 210, 210, '2026-05-22T18:00:00.000Z', '2026-05-22T09:30:00.000Z', '2026-05-22T18:00:00.000Z', 'done', 'client_rig_ppap', 'Portopiccolo', 'Production / Backend', 9, 'Preparato sito per produzione. Rimossi residui Replit. Aggiunte API serverless per properties, reviews e page video. Rafforzate configurazioni Guesty, SendGrid, Cloudinary, admin e database. Migliorata robustezza senza DATABASE_URL. Aggiunti headers sicurezza/cache. Ottimizzati hero video, poster, immagini territoriali, experiences e OpenGraph. Corretti scroll mobile, spaziature, checkout e booking. PR codex/portopiccolo-production-ready mergeata.', 'Axel Fleureau', '["cto-profile","2026-05-22","portopiccolo","production","mobile"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-22T09:30:00.000Z', '2026-05-22T18:00:00.000Z', NULL),
('task_axel_profile_20260522_finestre_art', 'org_demo_righello', 'project_internal_finestre_art', 'mem_axel_fleureau', '2026-05-22 - Finestre Art performance e product polish', 'Performance, caching API, logo reale, data model e responsive product pages.', 'done', 'medium', 150, 150, '2026-05-22T18:00:00.000Z', '2026-05-22T11:30:00.000Z', '2026-05-22T18:00:00.000Z', 'done', 'client_rig_finestre_art', 'Finestre Art', 'Performance / Branding', 8, 'Migliorate performance prodotto e categorie. Aggiunto caching API su finestre, porte, scuri, tapparelle e configurazioni. Inserito logo SVG reale in navbar e reveal. Aggiunta struttura dati linee finestra. Aggiornati naming e contenuti commerciali. Corretto allineamento tooltip e spec pin. Migliorati layout responsive e prevenuti mismatch immagini/profili.', 'Axel Fleureau', '["cto-profile","2026-05-22","finestre-art","performance","branding"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-22T11:30:00.000Z', '2026-05-22T18:00:00.000Z', NULL),

('task_axel_profile_20260523_revolut', 'org_demo_righello', 'project_internal_revolut_crypto_scalper', 'mem_axel_fleureau', '2026-05-23 - Revolut Scalper edge intelligence e risk guards', 'Reporting edge, analytics, capital preservation, scanner, cooldown e test.', 'done', 'high', 75, 75, '2026-05-23T18:00:00.000Z', '2026-05-23T08:00:00.000Z', '2026-05-23T18:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Trading Automation', 8, 'Implementato reporting misurabile dell edge. Aggiunta intelligence analytics per report giornalieri. Rafforzati guardrail di capital preservation e controlli risk-off. Migliorata logica scanner per segnali deboli. Introdotto cooldown buy dopo ordini stale. Risolti alert sicurezza dipendenze. Aggiunti test risk engine, execution fills, scanner guards e worker buy guards. Aggiunto script diagnostico VPS.', 'Axel Fleureau', '["cto-profile","2026-05-23","revolut","risk","testing"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-23T08:00:00.000Z', '2026-05-23T18:00:00.000Z', NULL),
('task_axel_profile_20260523_optima', 'org_demo_righello', 'project_internal_optima', 'mem_axel_fleureau', '2026-05-23 - Optima Cloudflare product foundation', 'Cloudflare/OpenNext, Clerk, task management, notifiche, AI, Magnific e mobile UX.', 'done', 'urgent', 180, 180, '2026-05-23T18:00:00.000Z', '2026-05-23T08:30:00.000Z', '2026-05-23T18:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Product Engineering', 10, 'Deployata base Cloudflare/OpenNext. Configurato dominio produzione e Clerk. Aggiunta documentazione Cloudflare. Implementato task/project management con approvazioni, allegati e assegnazioni. Aggiunte notifiche email task. Introdotte dashboard, management, presenze, rapportini, preventivi e workspace. Aggiunto time tracking. Rifattorizzati login, registrazione e recupero password. Potenziata AI assistant. Aggiunto Magnific Studio. Ridisegnata landing e copy leadership. Corretti overflow mobile. Aggiunto sistema notifiche D1-backed e seed operativo Axel.', 'Axel Fleureau', '["cto-profile","2026-05-23","optima","cloudflare","ai","mobile"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-23T08:30:00.000Z', '2026-05-23T18:00:00.000Z', NULL),
('task_axel_profile_20260523_solero', 'org_demo_righello', 'project_internal_solero_sport_village', 'mem_axel_fleureau', '2026-05-23 - Solero hero, identity e fallback reali', 'Hero video, logo system, vecchio sito come fallback, routing e mobile performance.', 'done', 'high', 130, 130, '2026-05-23T18:00:00.000Z', '2026-05-23T10:00:00.000Z', '2026-05-23T18:00:00.000Z', 'done', 'client_rig_ssvo', 'Solero Sport Village', 'Frontend / Branding', 8, 'Ottimizzata home hero con video coverage, gradient continuity, exit blend e scroll animation. Aggiunti logo icon, wordmark e glass wordmark. Aggiornati favicon e asset identita. Usate immagini vecchio sito come fallback realistici. Corretta hero Waterpark e performance mobile. Rafforzati production loading e contact map. Aggiunto toggle corsi, hardened routing service template, corretti default Discoteca/Waterpark, ridotta scala gallery tecnica mobile, alias legacy Mangio e animazioni scroll mobile ottimizzate.', 'Axel Fleureau', '["cto-profile","2026-05-23","solero","hero","branding"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-23T10:00:00.000Z', '2026-05-23T18:00:00.000Z', NULL),
('task_axel_profile_20260523_lumis', 'org_demo_righello', 'project_internal_lumis_photo_publisher', 'mem_axel_fleureau', '2026-05-23 - Lumis iOS native and TestFlight readiness', 'Target iOS SwiftUI, ClerkKit, upload queue, review mode, Worker config e TestFlight.', 'done', 'high', 180, 180, '2026-05-23T18:00:00.000Z', '2026-05-23T11:00:00.000Z', '2026-05-23T18:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'iOS / Backend', 9, 'Creato target iOS nativo con Xcode. Implementata base SwiftUI con ClerkKit. Aggiornata landing Lumis. Stabilizzati login, session restore, Google auth handoff e role resolution. Rafforzato upload foto con queue stabile e file-backed upload. Aggiunta paginazione foto evento, empty state su sync error, refresh foreground, logo e avatar portfolio. Aggiunto Apple review mode, demo access e remote config. Esposta config mobile dal Worker. Inserite upload rights iOS/web. Incrementate build TestFlight e mergeata PR live-camera-import-landing.', 'Axel Fleureau', '["cto-profile","2026-05-23","lumis","ios","testflight"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-23T11:00:00.000Z', '2026-05-23T18:00:00.000Z', NULL),
('task_axel_profile_20260523_buffr', 'org_demo_righello', 'project_internal_buffr', 'mem_axel_fleureau', '2026-05-23 - BUFFR iOS camera cloud sync foundation', 'Camera nativa iOS, Expo/Swift bridge, cloud sync, entitlement e App Store checklist.', 'done', 'high', 140, 140, '2026-05-23T18:00:00.000Z', '2026-05-23T12:00:00.000Z', '2026-05-23T18:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Mobile / Cloud Sync', 8, 'Preparata app mobile BUFFR con camera nativa iOS. Aggiunto progetto iOS completo, bridge Swift e configurazioni Expo. Aggiornate auth, gallery, home, settings e clip management. Implementato cloud sync worker. Aggiunte entitlement premium e remote config. Preparata build TestFlight. Aggiunta retention clip 7 giorni, checklist App Store, brand assets, splash, font e configurazioni export.', 'Axel Fleureau', '["cto-profile","2026-05-23","buffr","ios","cloud-sync"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-23T12:00:00.000Z', '2026-05-23T18:00:00.000Z', NULL),
('task_axel_profile_20260523_morocco', 'org_demo_righello', 'project_internal_morocco_tours', 'mem_axel_fleureau', '2026-05-23 - Morocco Tours migration Cloudflare D1', 'D1 runtime, Wrangler, migration SQL, seed generator, auth compat e OpenNext.', 'done', 'medium', 75, 75, '2026-05-23T18:00:00.000Z', '2026-05-23T14:00:00.000Z', '2026-05-23T18:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Cloudflare / Database', 7, 'Migrato runtime verso Cloudflare D1. Aggiunta configurazione Wrangler e migration SQL iniziale. Aggiunto seed generator D1. Rifattorizzato database layer. Aggiornati auth e compatibilita Firebase/Firestore. Aggiornate API contenuti pubblici e populate services. Allineate dipendenze Next/OpenNext per deploy Cloudflare.', 'Axel Fleureau', '["cto-profile","2026-05-23","morocco","cloudflare","d1"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-23T14:00:00.000Z', '2026-05-23T18:00:00.000Z', NULL),

('task_axel_profile_20260524_revolut', 'org_demo_righello', 'project_internal_revolut_crypto_scalper', 'mem_axel_fleureau', '2026-05-24 - Revolut momentum discovery lane', 'Momentum discovery, sentiment alignment e posizioni profittevoli lasciate correre.', 'done', 'medium', 120, 120, '2026-05-24T18:00:00.000Z', '2026-05-24T08:30:00.000Z', '2026-05-24T18:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Trading Strategy', 7, 'Aggiunta lane di momentum discovery nello scanner. Ampliata discovery momentum per intercettare piu opportunita. Allineato news sentiment con universo scanner. Permesso alle posizioni profittevoli di correre piu a lungo.', 'Axel Fleureau', '["cto-profile","2026-05-24","revolut","momentum"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-24T08:30:00.000Z', '2026-05-24T18:00:00.000Z', NULL),
('task_axel_profile_20260524_solero', 'org_demo_righello', 'project_internal_solero_sport_village', 'mem_axel_fleureau', '2026-05-24 - Solero mobile gallery refinements', 'Scala gallery tecnica, scroll mobile hero/home e content brief.', 'done', 'medium', 90, 90, '2026-05-24T18:00:00.000Z', '2026-05-24T10:00:00.000Z', '2026-05-24T18:00:00.000Z', 'done', 'client_rig_ssvo', 'Solero Sport Village', 'Mobile UX', 6, 'Ridotta scala gallery tecnica mobile. Rifinito scroll mobile hero e home gallery. Integrato content brief Solero.', 'Axel Fleureau', '["cto-profile","2026-05-24","solero","mobile"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-24T10:00:00.000Z', '2026-05-24T18:00:00.000Z', NULL),
('task_axel_profile_20260524_lumis', 'org_demo_righello', 'project_internal_lumis_photo_publisher', 'mem_axel_fleureau', '2026-05-24 - Lumis iOS startup and review stability', 'Crash restore, review mode persistence e build TestFlight.', 'done', 'medium', 60, 60, '2026-05-24T18:00:00.000Z', '2026-05-24T12:00:00.000Z', '2026-05-24T18:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'iOS Stability', 6, 'Corretto crash di restore all avvio iOS. Evitata persistenza impropria della review mode iOS. Incrementata build iOS per TestFlight.', 'Axel Fleureau', '["cto-profile","2026-05-24","lumis","ios","stability"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-24T12:00:00.000Z', '2026-05-24T18:00:00.000Z', NULL),
('task_axel_profile_20260524_buffr', 'org_demo_righello', 'project_internal_buffr', 'mem_axel_fleureau', '2026-05-24 - BUFFR cloud progress and playback stability', 'Monotonic progress, gallery playback, retry upload e iOS builds.', 'done', 'medium', 90, 90, '2026-05-24T18:00:00.000Z', '2026-05-24T13:00:00.000Z', '2026-05-24T18:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Mobile / Sync', 7, 'Reso monotonic il progresso upload/download cloud. Migliorata stabilita playback gallery durante refresh. Rafforzato retry upload cloud. Incrementate build iOS.', 'Axel Fleureau', '["cto-profile","2026-05-24","buffr","cloud-sync"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-24T13:00:00.000Z', '2026-05-24T18:00:00.000Z', NULL),

('task_axel_profile_20260525_revolut', 'org_demo_righello', 'project_internal_revolut_crypto_scalper', 'mem_axel_fleureau', '2026-05-25 - Revolut rotation, allocation and dynamic execution', 'Rotazione cluster, expected upside gating, wallet balance, breakout winners ed execution momentum.', 'done', 'high', 150, 150, '2026-05-25T18:00:00.000Z', '2026-05-25T08:00:00.000Z', '2026-05-25T18:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Trading Execution', 8, 'Consentita rotazione tra asset dello stesso cluster verso target piu forti. Introdotto gating rotazioni basato su expected upside. Aggiunta gestione piu aggressiva delle opportunita. Allineate posizioni live con wallet balance. Prioritizzati breakout winner sotto-allocati. Estesa execution dinamica su segnali momentum.', 'Axel Fleureau', '["cto-profile","2026-05-25","revolut","execution"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-25T08:00:00.000Z', '2026-05-25T18:00:00.000Z', NULL),
('task_axel_profile_20260525_solero', 'org_demo_righello', 'project_internal_solero_sport_village', 'mem_axel_fleureau', '2026-05-25 - Solero refinements mobile admin and content polish', 'Mobile/admin refinements, gallery stability, filters, pricing visibility, storytelling and magnetic snap.', 'done', 'high', 180, 180, '2026-05-25T18:00:00.000Z', '2026-05-25T09:00:00.000Z', '2026-05-25T18:00:00.000Z', 'done', 'client_rig_ssvo', 'Solero Sport Village', 'Frontend / Admin', 8, 'Completati refinements mobile e admin. Rimosse startup loading transitions. Sistemato header desktop. Stabilizzata gallery tecnica. Corretto filtro eta corsi e layout filtri. Nascosti prezzi pubblici. Mostrati schedule solo quando configurati. Ottimizzate interazioni scroll home. Aggiunta intro narrativa showcase galleries. Spostati dettagli contatto in hero. Applicato glass al logo hero. Aggiunto magnetic snap alla home gallery.', 'Axel Fleureau', '["cto-profile","2026-05-25","solero","admin","mobile"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-25T09:00:00.000Z', '2026-05-25T18:00:00.000Z', NULL),
('task_axel_profile_20260525_buffr', 'org_demo_righello', 'project_internal_buffr', 'mem_axel_fleureau', '2026-05-25 - BUFFR Stripe billing and App Store review mode', 'Stripe secrets, billing integration, capture, gallery, premium overrides and review mode.', 'done', 'medium', 150, 150, '2026-05-25T18:00:00.000Z', '2026-05-25T10:30:00.000Z', '2026-05-25T18:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Mobile / Billing', 7, 'Documentati secret Stripe per worker. Aggiunto template env publishable key. Aggiunta integrazione billing Stripe. Migliorata capture screen. Rifinita gallery playback e premium overrides. Disabilitato billing premium in App Store review. Migliorato grouping gallery e transizione video.', 'Axel Fleureau', '["cto-profile","2026-05-25","buffr","stripe","app-store"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-25T10:30:00.000Z', '2026-05-25T18:00:00.000Z', NULL),
('task_axel_profile_20260525_scale', 'org_demo_righello', 'project_internal_scale_site', 'mem_axel_fleureau', '2026-05-25 - Scale Site creation and launch base', 'New Scale.ch site, Swiss typography, PESO methodology, Cloudflare Pages and product copy.', 'done', 'high', 240, 240, '2026-05-25T18:00:00.000Z', '2026-05-25T11:30:00.000Z', '2026-05-25T18:00:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Brand / Frontend', 9, 'Creato nuovo sito Scale.ch partendo dalla base Righello. Stabilizzata homepage e scroll experience. Applicato stile tipografico Swiss. Aggiunti asset logo Scale. Aggiunta sezione PESO methodology e Scale PESO. Raffinati hero MacBook mockup e visual components. Reso contact flow static-friendly. Aggiunto supporto Cloudflare Pages. Auditato design system e prodotti. Rifinita copy servizi, pagine progetto e posizionamento brand.', 'Axel Fleureau', '["cto-profile","2026-05-25","scale","seo","cloudflare-pages"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-25T11:30:00.000Z', '2026-05-25T18:00:00.000Z', NULL),

('task_axel_profile_20260526_revolut', 'org_demo_righello', 'project_internal_revolut_crypto_scalper', 'mem_axel_fleureau', '2026-05-26 - Revolut scout trades and buy guard tests', 'Scout trades, execution validation, ticker, sentiment, scorer and scanner tests.', 'done', 'medium', 90, 90, '2026-05-26T11:50:00.000Z', '2026-05-26T07:00:00.000Z', '2026-05-26T11:50:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Trading / Testing', 7, 'Aggiunti scout trade con breakout reserve. Rafforzata logica di validazione execution e buy guards. Aggiunti test su ticker Revolut, sentiment, opportunity scorer e scanner.', 'Axel Fleureau', '["cto-profile","2026-05-26","revolut","testing"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-26T07:00:00.000Z', '2026-05-26T11:50:00.000Z', NULL),
('task_axel_profile_20260526_optima', 'org_demo_righello', 'project_internal_optima', 'mem_axel_fleureau', '2026-05-26 - Optima production readiness and AI API cleanup', 'Readiness checks, health API, AI feedback/image/visual API cleanup, docs and verify script.', 'done', 'urgent', 100, 100, '2026-05-26T11:50:00.000Z', '2026-05-26T07:30:00.000Z', '2026-05-26T11:50:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Production Readiness', 9, 'Aggiunti controlli production readiness. Aggiunta API health check. Pulite e rifinite API AI feedback, generate image e generate visual. Aggiornata documentazione Cloudflare. Aggiunto script di verifica produzione.', 'Axel Fleureau', '["cto-profile","2026-05-26","optima","production","ai"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-26T07:30:00.000Z', '2026-05-26T11:50:00.000Z', NULL),
('task_axel_profile_20260526_solero', 'org_demo_righello', 'project_internal_solero_sport_village', 'mem_axel_fleureau', '2026-05-26 - Solero production optimization and admin lead management', 'Bundle, demo CMS, about editable, gallery storytelling, mobile filters and lead management.', 'done', 'high', 130, 130, '2026-05-26T11:50:00.000Z', '2026-05-26T08:00:00.000Z', '2026-05-26T11:50:00.000Z', 'done', 'client_rig_ssvo', 'Solero Sport Village', 'Frontend / CMS', 8, 'Ottimizzato bundle pubblico e caricamento produzione. Aggiunta modalita demo admin CMS. Resa pagina Chi siamo modificabile da admin. Rifinita gallery vetrina storytelling. Corretto fit logo hero mobile. Migliorata home gallery magnetic scroll. Rimossi schedule pubblici non confermati. Aggiunto flusso admin lead management. Migliorata barra filtro corsi mobile e UX filtri corsi.', 'Axel Fleureau', '["cto-profile","2026-05-26","solero","cms","lead-management"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-26T08:00:00.000Z', '2026-05-26T11:50:00.000Z', NULL),
('task_axel_profile_20260526_lumis', 'org_demo_righello', 'project_internal_lumis_photo_publisher', 'mem_axel_fleureau', '2026-05-26 - Lumis persistent upload queue and native UX', 'Persistent upload queue, session stability, workspace cache, native hero animation and pricing/watermark.', 'done', 'high', 100, 100, '2026-05-26T11:50:00.000Z', '2026-05-26T08:30:00.000Z', '2026-05-26T11:50:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'iOS / Upload Pipeline', 8, 'Aggiunto upload queue persistente per foto iOS. Stabilizzata sessione upload foto. Migliorata pipeline upload e workspace cache. Aggiunta animazione nativa hero foto. Corretta gestione pricing evento e watermark su iOS.', 'Axel Fleureau', '["cto-profile","2026-05-26","lumis","upload","ios"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-26T08:30:00.000Z', '2026-05-26T11:50:00.000Z', NULL),
('task_axel_profile_20260526_portopiccolo', 'org_demo_righello', 'project_internal_portopiccolo', 'mem_axel_fleureau', '2026-05-26 - Portopiccolo UX audit and Cloudinary assets', 'UX readiness, team avatars, Chi Siamo, Experiences Grid and backend routes.', 'done', 'medium', 70, 70, '2026-05-26T11:50:00.000Z', '2026-05-26T09:00:00.000Z', '2026-05-26T11:50:00.000Z', 'done', 'client_rig_ppap', 'Portopiccolo', 'UX Audit / Backend', 6, 'Rafforzata readiness UX audit. Aggiunti avatar team via Cloudinary. Migliorate sezioni Chi Siamo ed Experiences Grid. Aggiornate route server per supportare nuovi asset e contenuti.', 'Axel Fleureau', '["cto-profile","2026-05-26","portopiccolo","cloudinary","ux"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-26T09:00:00.000Z', '2026-05-26T11:50:00.000Z', NULL),
('task_axel_profile_20260526_buffr', 'org_demo_righello', 'project_internal_buffr', 'mem_axel_fleureau', '2026-05-26 - BUFFR gallery transition and football capture mode', 'Hero video gallery, mounted transitions, dismiss behavior, build 55, football mode and worker sync.', 'done', 'medium', 120, 120, '2026-05-26T11:50:00.000Z', '2026-05-26T09:15:00.000Z', '2026-05-26T11:50:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'Mobile / Release', 7, 'Ottimizzata transizione video hero in gallery. Mantenuta gallery montata durante transizioni video. Rifinito dismiss behavior della hero gallery. Incrementate build iOS fino alla build 55. Aggiunto football capture mode. Aggiornati worker, remote config, settings e sync client.', 'Axel Fleureau', '["cto-profile","2026-05-26","buffr","gallery","release"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-26T09:15:00.000Z', '2026-05-26T11:50:00.000Z', NULL),
('task_axel_profile_20260526_scale', 'org_demo_righello', 'project_internal_scale_site', 'mem_axel_fleureau', '2026-05-26 - Scale Site multilingual SEO and launch polish', 'Localized routes, language switcher, SEO, robots, sitemap, llms, motion root and Cloudflare statics.', 'done', 'high', 130, 130, '2026-05-26T11:50:00.000Z', '2026-05-26T09:30:00.000Z', '2026-05-26T11:50:00.000Z', 'done', 'client_internal_righello_ops', 'Righello', 'SEO / Frontend', 8, 'Introdotto posizionamento multilingua e SEO. Aggiunte rotte localizzate per pagine principali, servizi, progetti, contatti, privacy e coming soon. Aggiunti language switcher, localized SEO e store lingua. Rifinita navigazione mobile, footer, manifesto loop e brand nav. Aggiornati robots, sitemap, service worker e llms.txt. Rifinito sito in vista lancio. Aggiunto ScaleMotionRoot. Migliorati header, footer, custom cursor, sticky scroll reveal e MacBook mockup. Aggiunti _headers e _redirects Cloudflare. Stabilizzato manifesto marquee loop.', 'Axel Fleureau', '["cto-profile","2026-05-26","scale","seo","multilingual"]', '[]', '[]', '[]', 'mem_axel_fleureau', 'accepted', 'mem_axel_fleureau', '2026-05-26T09:30:00.000Z', '2026-05-26T11:50:00.000Z', NULL)
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
  updated_at = excluded.updated_at,
  column_id = excluded.column_id,
  client_id = excluded.client_id,
  client_name = excluded.client_name,
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
  AND id LIKE 'task_axel_profile_2026%'
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

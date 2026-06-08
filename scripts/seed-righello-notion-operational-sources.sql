-- Sorgenti Notion operative Righello da usare come memoria dati importabile in Optima.
-- Policy: nessun download allegati/OneDrive, nessun segreto, import redatto e idempotente.

INSERT INTO external_data_sources (
  id,
  organization_id,
  provider,
  source_type,
  external_id,
  title,
  url,
  domain,
  status,
  sync_mode,
  schema_json,
  allowed_fields_json,
  redacted_fields_json,
  last_synced_at,
  updated_at
) VALUES
(
  'extsrc_notion_rig_clienti',
  'org_demo_righello',
  'notion',
  'database',
  'collection://28132473-a5fc-8035-803f-000b76e5cbf3',
  'RIG_CLIENTI RIGHELLO',
  'https://app.notion.com/p/28132473a5fc80edb121e2d11a2a4968',
  'clients',
  'active',
  'manual_mcp_until_oauth',
  '{"title":"Name","relations":["RIG_WORK"],"purpose":"client_crm"}',
  '["Name","NOME ATTIVITA''","CODICE","TIPO","STATO","SORGENTE","TIPOLOGIA LAVORI","Comune","RIG_WORK"]',
  '["EMAIL","TELEFONO","PEC","Partita IVA","Codice Fiscale","Codice Destinatario","Contratti & Preventivi"]',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'extsrc_notion_rig_work',
  'org_demo_righello',
  'notion',
  'database',
  'collection://27f32473-a5fc-818d-8448-000b562dd5cf',
  'RIG_WORK',
  'https://app.notion.com/p/27f32473a5fc81f590b7cead9baa872b',
  'work',
  'active',
  'manual_mcp_until_oauth',
  '{"title":"NOME TASK","types":["PREVENTIVO","CALL","MEETING","SITO WEB","WEBAPP"],"purpose":"work_crm_quotes"}',
  '["NOME TASK","CLIENTE","STATO","TIPO","PRIORITA''","DEADLINE","Minutes","DESCRIZIONE","CLIENTI RIGHELLO"]',
  '["EMAIL CLIENTE","EMAIL PERSONA","ALLEGATI","LINK ONEDRIVE","Attachments","COSTI","GUADAGNI"]',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
),
(
  'extsrc_notion_quote_configurator',
  'org_demo_righello',
  'notion',
  'page',
  'notion:page:27f32473-a5fc-8130-9985-c3d4b4728bf4',
  'Configuratore preventivi Righello',
  'https://app.notion.com/p/27f32473a5fc81309985c3d4b4728bf4',
  'quotes',
  'active',
  'manual_mcp_until_oauth',
  '{"purpose":"quote_workflow_reference"}',
  '["SCEGLI UN PACCHETTO","CONFIGURA I SERVIZI","DATI CLIENTE","RIEPILOGO","PREVENTIVO","DASHBOARD AMMINISTRAZIONE","STILE"]',
  '["secrets","attachments","private_files"]',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT(organization_id, provider, external_id) DO UPDATE SET
  title = excluded.title,
  url = excluded.url,
  domain = excluded.domain,
  status = excluded.status,
  sync_mode = excluded.sync_mode,
  schema_json = excluded.schema_json,
  allowed_fields_json = excluded.allowed_fields_json,
  redacted_fields_json = excluded.redacted_fields_json,
  last_synced_at = CURRENT_TIMESTAMP,
  updated_at = CURRENT_TIMESTAMP;

UPDATE quotes
SET
  source_type = 'notion',
  source_id = 'notion:page:d54bd3ae-c7b4-45a7-81be-6f21cfcdd5ae',
  source_url = 'https://app.notion.com/p/d54bd3aec7b445a781be6f21cfcdd5ae',
  source_snapshot_json = '{"sourceTitle":"RIGHELLO | Preventivo - Porto Piccolo Apartments | Sito Front-End (5 pagine)","paymentProof":false,"vatExcluded":true}',
  updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND id = 'quote_notion_portopiccolo_frontend_20260221';

UPDATE quotes
SET
  source_type = 'notion',
  source_id = 'notion:page:78381d76-731a-4142-9855-4312d34b82c6',
  source_url = 'https://app.notion.com/p/78381d76731a414298554312d34b82c6',
  source_snapshot_json = '{"sourceTitle":"RIGHELLO | Preventivo - Porto Piccolo Apartments | Back-end + Guesty (mobile-first)","paymentProof":false,"vatExcluded":true,"variant":"standard"}',
  updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND id = 'quote_notion_portopiccolo_backoffice_guesty_standard_20260221';

UPDATE quotes
SET
  source_type = 'notion',
  source_id = 'notion:page:78381d76-731a-4142-9855-4312d34b82c6#accelerata',
  source_url = 'https://app.notion.com/p/78381d76731a414298554312d34b82c6',
  source_snapshot_json = '{"sourceTitle":"RIGHELLO | Preventivo - Porto Piccolo Apartments | Back-end + Guesty (mobile-first)","paymentProof":false,"vatExcluded":true,"variant":"accelerata"}',
  updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND id = 'quote_notion_portopiccolo_backoffice_guesty_accelerata_20260221';

INSERT INTO external_data_records (
  id,
  organization_id,
  source_id,
  provider,
  record_type,
  external_id,
  external_url,
  title,
  summary,
  client_id,
  quote_id,
  occurred_at,
  amount_cents,
  currency,
  confidence,
  content_hash,
  raw_json,
  normalized_json,
  updated_at
) VALUES
(
  'extrec_notion_portopiccolo_frontend_20260221',
  'org_demo_righello',
  'extsrc_notion_rig_work',
  'notion',
  'quote',
  'notion:page:d54bd3ae-c7b4-45a7-81be-6f21cfcdd5ae',
  'https://app.notion.com/p/d54bd3aec7b445a781be6f21cfcdd5ae',
  'Portopiccolo Apartments - preventivo sito front-end 5 pagine',
  'Preventivo Notion per sviluppo front-end a codice, 5 pagine, booking esterno escluso. Totale 3.795 euro + IVA; non e prova di pagamento/incasso.',
  'client_rig_ppap',
  'quote_notion_portopiccolo_frontend_20260221',
  '2026-02-21T07:01:57.571Z',
  379500,
  'EUR',
  'extracted',
  'notion_portopiccolo_frontend_379500',
  '{"source":"RIG_WORK","redacted":true}',
  '{"client":"Portopiccolo Apartments","service":"website_frontend","vatExcluded":true,"paymentProof":false}',
  CURRENT_TIMESTAMP
),
(
  'extrec_notion_portopiccolo_guesty_standard_20260221',
  'org_demo_righello',
  'extsrc_notion_rig_work',
  'notion',
  'quote',
  'notion:page:78381d76-731a-4142-9855-4312d34b82c6#standard',
  'https://app.notion.com/p/78381d76731a414298554312d34b82c6',
  'Portopiccolo Apartments - preventivo back-end e Guesty standard',
  'Preventivo Notion per rifacimento sito con back-end, pannello gestione e integrazione Guesty API. Opzione standard 5.000 euro + IVA, circa 90 giorni; non e prova di pagamento/incasso.',
  'client_rig_ppap',
  'quote_notion_portopiccolo_backoffice_guesty_standard_20260221',
  '2026-02-21T08:28:23.289Z',
  500000,
  'EUR',
  'extracted',
  'notion_portopiccolo_guesty_standard_500000',
  '{"source":"RIG_WORK","redacted":true}',
  '{"client":"Portopiccolo Apartments","service":"backend_guesty","variant":"standard","vatExcluded":true,"paymentProof":false}',
  CURRENT_TIMESTAMP
),
(
  'extrec_notion_portopiccolo_guesty_accelerata_20260221',
  'org_demo_righello',
  'extsrc_notion_rig_work',
  'notion',
  'quote',
  'notion:page:78381d76-731a-4142-9855-4312d34b82c6#accelerata',
  'https://app.notion.com/p/78381d76731a414298554312d34b82c6',
  'Portopiccolo Apartments - preventivo back-end e Guesty accelerata',
  'Preventivo Notion per rifacimento sito con back-end, pannello gestione e integrazione Guesty API. Variante accelerata 5.500 euro + IVA, 30 giorni lavorativi; non e prova di pagamento/incasso.',
  'client_rig_ppap',
  'quote_notion_portopiccolo_backoffice_guesty_accelerata_20260221',
  '2026-02-21T08:28:23.289Z',
  550000,
  'EUR',
  'extracted',
  'notion_portopiccolo_guesty_accelerata_550000',
  '{"source":"RIG_WORK","redacted":true}',
  '{"client":"Portopiccolo Apartments","service":"backend_guesty","variant":"accelerated","vatExcluded":true,"paymentProof":false}',
  CURRENT_TIMESTAMP
),
(
  'extrec_notion_preventivo_whatsapp_20251201',
  'org_demo_righello',
  'extsrc_notion_rig_work',
  'notion',
  'quote',
  'notion:page:29532473-a5fc-80a2-858d-d09e42cf8577',
  'https://app.notion.com/p/29532473a5fc80a2858dd09e42cf8577',
  'PREVENTIVO WHATSAPP',
  'Pattern preventivo storico Notion: contratto annuale rinnovabile, validita preventivo 60 giorni. Da usare come riferimento pricing, non come incasso verificato.',
  NULL,
  NULL,
  '2025-12-01T10:59:00.000Z',
  NULL,
  'EUR',
  'extracted',
  'notion_preventivo_whatsapp_20251201',
  '{"source":"Notion search","redacted":true}',
  '{"service":"whatsapp_api_ai","paymentProof":false,"needsFullFetch":true}',
  CURRENT_TIMESTAMP
),
(
  'extrec_notion_preventivo_solero_20251201',
  'org_demo_righello',
  'extsrc_notion_rig_work',
  'notion',
  'quote',
  'notion:page:27f32473-a5fc-8140-bd31-f13f452a6cfd',
  'https://app.notion.com/p/27f32473a5fc8140bd31f13f452a6cfd',
  'PREVENTIVO SITO WEB SOLERO',
  'Pattern preventivo storico Notion relativo a sito web Solero. Da completare con fetch/import puntuale prima di usarlo come dato economico.',
  NULL,
  NULL,
  '2025-12-01T10:59:00.000Z',
  NULL,
  'EUR',
  'extracted',
  'notion_preventivo_solero_20251201',
  '{"source":"Notion search","redacted":true}',
  '{"service":"website","paymentProof":false,"needsFullFetch":true}',
  CURRENT_TIMESTAMP
)
ON CONFLICT(organization_id, provider, external_id) DO UPDATE SET
  source_id = excluded.source_id,
  record_type = excluded.record_type,
  external_url = excluded.external_url,
  title = excluded.title,
  summary = excluded.summary,
  client_id = excluded.client_id,
  quote_id = excluded.quote_id,
  occurred_at = excluded.occurred_at,
  amount_cents = excluded.amount_cents,
  currency = excluded.currency,
  confidence = excluded.confidence,
  content_hash = excluded.content_hash,
  raw_json = excluded.raw_json,
  normalized_json = excluded.normalized_json,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO agentic_graph_edges (
  id,
  organization_id,
  from_node_id,
  to_node_id,
  edge_type,
  confidence,
  weight,
  properties_json,
  created_by_member_id,
  updated_at
)
SELECT
  'agedge_agentic_graph_memory_notion_sources',
  'org_demo_righello',
  graph_memory.id,
  notion_quotes.id,
  'feeds_operational_context',
  'manual',
  0.94,
  '{"tables":["external_data_sources","external_data_records","quotes","client_interactions"],"policy":"redacted_no_attachments"}',
  'mem_user_3E4tpdQTiVvfPzeGMp8nPRydJQB',
  CURRENT_TIMESTAMP
FROM agentic_graph_nodes graph_memory
JOIN agentic_graph_nodes notion_quotes
  ON notion_quotes.organization_id = graph_memory.organization_id
 AND notion_quotes.source_id = 'notion:rig_work:quote-patterns'
WHERE graph_memory.organization_id = 'org_demo_righello'
  AND graph_memory.source_id = 'agentic-graph-memory'
ON CONFLICT(organization_id, from_node_id, to_node_id, edge_type) DO UPDATE SET
  confidence = excluded.confidence,
  weight = excluded.weight,
  properties_json = excluded.properties_json,
  updated_at = CURRENT_TIMESTAMP;

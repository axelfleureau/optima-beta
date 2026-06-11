-- Import redatto di preventivi Portopiccolo trovati in Notion.
-- Fonte: Notion "Richieste Documenti", 21/02/2026.
-- Nota: questi record rappresentano preventivi/proposte, non pagamenti o incassi verificati.

INSERT INTO quotes (
  id,
  organization_id,
  client_id,
  title,
  description,
  client_name,
  status,
  currency,
  total_cents,
  valid_until,
  created_at,
  updated_at
) VALUES
(
  'quote_notion_portopiccolo_frontend_20260221',
  'org_demo_righello',
  'client_rig_ppap',
  'Porto Piccolo Apartments - sito front-end 5 pagine',
  'Fonte Notion: RIGHELLO | Preventivo - Porto Piccolo Apartments | Sito Front-End (5 pagine). Sviluppo front-end a codice, 5 pagine, booking esterno escluso. Totale sviluppo: 3.795 euro + IVA. Pagamento previsto: 50% conferma, 50% consegna. Non e'' una prova di pagamento/incasso.',
  'Portopiccolo Apartments',
  'draft',
  'EUR',
  379500,
  '2026-03-07T00:00:00.000Z',
  '2026-02-21T07:01:57.571Z',
  CURRENT_TIMESTAMP
),
(
  'quote_notion_portopiccolo_backoffice_guesty_standard_20260221',
  'org_demo_righello',
  'client_rig_ppap',
  'Porto Piccolo Apartments - back-end e Guesty standard',
  'Fonte Notion: RIGHELLO | Preventivo - Porto Piccolo Apartments | Back-end + Guesty (mobile-first). Rifacimento sito con back-end, pannello gestione e integrazione Guesty API. Opzione standard: 5.000 euro + IVA, circa 90 giorni. Pagamento previsto: 50% conferma, 50% consegna. Non e'' una prova di pagamento/incasso.',
  'Portopiccolo Apartments',
  'draft',
  'EUR',
  500000,
  '2026-03-07T00:00:00.000Z',
  '2026-02-21T08:28:23.289Z',
  CURRENT_TIMESTAMP
),
(
  'quote_notion_portopiccolo_backoffice_guesty_accelerata_20260221',
  'org_demo_righello',
  'client_rig_ppap',
  'Porto Piccolo Apartments - back-end e Guesty accelerata',
  'Fonte Notion: RIGHELLO | Preventivo - Porto Piccolo Apartments | Back-end + Guesty (mobile-first). Variante accelerata: 5.500 euro + IVA, 30 giorni lavorativi, maggiorazione +10%. Pagamento previsto: 50% conferma, 50% consegna. Non e'' una prova di pagamento/incasso.',
  'Portopiccolo Apartments',
  'draft',
  'EUR',
  550000,
  '2026-03-07T00:00:00.000Z',
  '2026-02-21T08:28:23.289Z',
  CURRENT_TIMESTAMP
)
ON CONFLICT(id) DO UPDATE SET
  client_id = excluded.client_id,
  title = excluded.title,
  description = excluded.description,
  client_name = excluded.client_name,
  status = excluded.status,
  currency = excluded.currency,
  total_cents = excluded.total_cents,
  valid_until = excluded.valid_until,
  updated_at = CURRENT_TIMESTAMP;

UPDATE agentic_graph_nodes
SET
  summary = 'Pattern commerciali reali da usare come memoria redatta per migliorare precisione preventivi: sito base/Webflow, WhatsApp/API/AI annuale, Portopiccolo sito/front-end/back-end Guesty, task PREVENTIVO in RIG_WORK.',
  properties_json = json_set(
    COALESCE(NULLIF(properties_json, ''), '{}'),
    '$.examples',
    json_array(
      'CONTABILIZZARE TUBARO SITO: sito base, inserimento annunci, Webflow, pagamenti parziali',
      'PREVENTIVO WHATSAPP: opzioni annuali 18-22k, 10.5k/11.7k, 38.7k premium',
      'Portopiccolo Apartments front-end 5 pagine: 3.795 euro + IVA, booking esterno escluso',
      'Portopiccolo Apartments back-end + Guesty: 5.000 euro + IVA standard, 5.500 euro + IVA accelerata'
    )
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND source_id = 'notion:rig_work:quote-patterns';

INSERT INTO agentic_graph_nodes (
  id,
  organization_id,
  node_type,
  title,
  summary,
  source_type,
  source_id,
  source_url,
  confidence,
  tags_json,
  properties_json,
  created_by_member_id,
  updated_at
) VALUES
(
  'agnode_notion_portopiccolo_frontend_quote_20260221',
  'org_demo_righello',
  'notion_quote_pattern',
  'Portopiccolo Apartments - preventivo sito front-end',
  'Preventivo Notion per sito front-end a codice 5 pagine, booking esterno escluso. Totale sviluppo 3.795 euro + IVA; non e'' prova di pagamento/incasso.',
  'notion_righello',
  'notion:page:d54bd3ae-c7b4-45a7-81be-6f21cfcdd5ae',
  'https://app.notion.com/p/d54bd3aec7b445a781be6f21cfcdd5ae',
  'extracted',
  '["notion","righello","quotes","preventivi","portopiccolo","website"]',
  '{"client":"Portopiccolo Apartments","amountCents":379500,"currency":"EUR","vatExcluded":true,"paymentProof":false,"quoteId":"quote_notion_portopiccolo_frontend_20260221","sourceTitle":"RIGHELLO | Preventivo - Porto Piccolo Apartments | Sito Front-End (5 pagine)"}',
  'mem_user_3E4tpdQTiVvfPzeGMp8nPRydJQB',
  CURRENT_TIMESTAMP
),
(
  'agnode_notion_portopiccolo_guesty_quote_20260221',
  'org_demo_righello',
  'notion_quote_pattern',
  'Portopiccolo Apartments - preventivo back-end Guesty',
  'Preventivo Notion per rifacimento sito con back-end, pannello gestione e integrazione Guesty API. Standard 5.000 euro + IVA; accelerata 5.500 euro + IVA; non e'' prova di pagamento/incasso.',
  'notion_righello',
  'notion:page:78381d76-731a-4142-9855-4312d34b82c6',
  'https://app.notion.com/p/78381d76731a414298554312d34b82c6',
  'extracted',
  '["notion","righello","quotes","preventivi","portopiccolo","website","guesty"]',
  '{"client":"Portopiccolo Apartments","standardAmountCents":500000,"acceleratedAmountCents":550000,"currency":"EUR","vatExcluded":true,"paymentProof":false,"standardQuoteId":"quote_notion_portopiccolo_backoffice_guesty_standard_20260221","acceleratedQuoteId":"quote_notion_portopiccolo_backoffice_guesty_accelerata_20260221","sourceTitle":"RIGHELLO | Preventivo - Porto Piccolo Apartments | Back-end + Guesty (mobile-first)"}',
  'mem_user_3E4tpdQTiVvfPzeGMp8nPRydJQB',
  CURRENT_TIMESTAMP
)
ON CONFLICT(organization_id, node_type, source_type, source_id) DO UPDATE SET
  title = excluded.title,
  summary = excluded.summary,
  source_url = excluded.source_url,
  confidence = excluded.confidence,
  tags_json = excluded.tags_json,
  properties_json = excluded.properties_json,
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
) VALUES
(
  'agedge_notion_quote_patterns_portopiccolo_frontend',
  'org_demo_righello',
  'agnode_notion_quote_patterns',
  'agnode_notion_portopiccolo_frontend_quote_20260221',
  'contains_quote_pattern',
  'extracted',
  1,
  '{"seededBy":"seed-portopiccolo-notion-quotes-2026-02-21"}',
  'mem_user_3E4tpdQTiVvfPzeGMp8nPRydJQB',
  CURRENT_TIMESTAMP
),
(
  'agedge_notion_quote_patterns_portopiccolo_guesty',
  'org_demo_righello',
  'agnode_notion_quote_patterns',
  'agnode_notion_portopiccolo_guesty_quote_20260221',
  'contains_quote_pattern',
  'extracted',
  1,
  '{"seededBy":"seed-portopiccolo-notion-quotes-2026-02-21"}',
  'mem_user_3E4tpdQTiVvfPzeGMp8nPRydJQB',
  CURRENT_TIMESTAMP
),
(
  'agedge_notion_portopiccolo_frontend_client',
  'org_demo_righello',
  'agnode_notion_portopiccolo_frontend_quote_20260221',
  'agnode_notion_rig_clienti',
  'references_client_source',
  'inferred',
  0.7,
  '{"clientId":"client_rig_ppap"}',
  'mem_user_3E4tpdQTiVvfPzeGMp8nPRydJQB',
  CURRENT_TIMESTAMP
),
(
  'agedge_notion_portopiccolo_guesty_client',
  'org_demo_righello',
  'agnode_notion_portopiccolo_guesty_quote_20260221',
  'agnode_notion_rig_clienti',
  'references_client_source',
  'inferred',
  0.7,
  '{"clientId":"client_rig_ppap"}',
  'mem_user_3E4tpdQTiVvfPzeGMp8nPRydJQB',
  CURRENT_TIMESTAMP
)
ON CONFLICT(organization_id, from_node_id, to_node_id, edge_type) DO UPDATE SET
  confidence = excluded.confidence,
  weight = excluded.weight,
  properties_json = excluded.properties_json,
  updated_at = CURRENT_TIMESTAMP;

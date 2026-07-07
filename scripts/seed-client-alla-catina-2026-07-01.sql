INSERT INTO clients (
  id,
  organization_id,
  name,
  email,
  company,
  status,
  created_at,
  updated_at,
  code,
  type,
  source,
  work_type,
  notes,
  notion_url,
  import_source,
  last_imported_at
)
SELECT
  'client_alla_catina',
  'org_demo_righello',
  'Ristorante Alla Catina',
  '',
  'Ristorante Alla Catina',
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  'ALLA-CATINA',
  'ristorazione',
  'rapportino',
  'ristorante',
  'Sito ufficiale: https://www.ristoranteallacatina.it/',
  'https://www.ristoranteallacatina.it/',
  'manual_seed_2026_07_01',
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM clients
  WHERE organization_id = 'org_demo_righello'
    AND (
      id = 'client_alla_catina'
      OR lower(name) = lower('Ristorante Alla Catina')
      OR lower(company) = lower('Ristorante Alla Catina')
    )
);

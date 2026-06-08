ALTER TABLE quotes ADD COLUMN source_type TEXT;
ALTER TABLE quotes ADD COLUMN source_id TEXT;
ALTER TABLE quotes ADD COLUMN source_url TEXT;
ALTER TABLE quotes ADD COLUMN source_snapshot_json TEXT;

CREATE TABLE IF NOT EXISTS external_data_sources (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'database',
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  domain TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'active',
  sync_mode TEXT NOT NULL DEFAULT 'manual',
  schema_json TEXT NOT NULL DEFAULT '{}',
  allowed_fields_json TEXT NOT NULL DEFAULT '[]',
  redacted_fields_json TEXT NOT NULL DEFAULT '[]',
  last_cursor TEXT,
  last_synced_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_external_sources_org_domain
  ON external_data_sources (organization_id, domain, provider, updated_at);

CREATE TABLE IF NOT EXISTS external_data_records (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES external_data_sources(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  record_type TEXT NOT NULL DEFAULT 'note',
  external_id TEXT NOT NULL,
  external_url TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  quote_id TEXT REFERENCES quotes(id) ON DELETE SET NULL,
  interaction_id TEXT,
  occurred_at TEXT,
  amount_cents INTEGER,
  currency TEXT NOT NULL DEFAULT 'EUR',
  confidence TEXT NOT NULL DEFAULT 'manual',
  content_hash TEXT,
  raw_json TEXT NOT NULL DEFAULT '{}',
  normalized_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_external_records_org_type
  ON external_data_records (organization_id, record_type, updated_at);

CREATE INDEX IF NOT EXISTS idx_external_records_links
  ON external_data_records (organization_id, client_id, project_id, quote_id, interaction_id);

CREATE INDEX IF NOT EXISTS idx_external_records_search
  ON external_data_records (organization_id, title, record_type);

CREATE TABLE IF NOT EXISTS client_interactions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT,
  interaction_type TEXT NOT NULL DEFAULT 'note',
  status TEXT NOT NULL DEFAULT 'logged',
  occurred_at TEXT,
  ended_at TEXT,
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_id TEXT,
  source_url TEXT,
  participants_json TEXT NOT NULL DEFAULT '[]',
  properties_json TEXT NOT NULL DEFAULT '{}',
  created_by_member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_client_interactions_org_client
  ON client_interactions (organization_id, client_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_client_interactions_org_type
  ON client_interactions (organization_id, interaction_type, occurred_at);

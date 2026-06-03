CREATE TABLE IF NOT EXISTS client_knowledge_entries (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'note',
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  username TEXT,
  secret_value TEXT,
  is_sensitive INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  tags_json TEXT NOT NULL DEFAULT '[]',
  created_by_member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  updated_by_member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_knowledge_org_client
  ON client_knowledge_entries (organization_id, client_id, category, updated_at);

CREATE INDEX IF NOT EXISTS idx_client_knowledge_status
  ON client_knowledge_entries (organization_id, status, updated_at);

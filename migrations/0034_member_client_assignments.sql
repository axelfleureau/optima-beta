CREATE TABLE IF NOT EXISTS member_client_assignments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  assigned_by_member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, member_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_member_client_assignments_member
  ON member_client_assignments (organization_id, member_id, client_id);

CREATE INDEX IF NOT EXISTS idx_member_client_assignments_client
  ON member_client_assignments (organization_id, client_id, member_id);

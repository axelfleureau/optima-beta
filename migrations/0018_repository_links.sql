CREATE TABLE IF NOT EXISTS repository_links (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  repo_url TEXT NOT NULL,
  repo_branch TEXT NOT NULL DEFAULT 'main',
  workspace_hint TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, target_type, target_id, repo_url)
);

CREATE INDEX IF NOT EXISTS idx_repository_links_target
  ON repository_links(organization_id, target_type, target_id);

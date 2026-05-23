CREATE TABLE IF NOT EXISTS ai_media_generations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  media_type TEXT NOT NULL,
  prompt TEXT,
  status TEXT NOT NULL,
  task_id TEXT NOT NULL,
  result_urls_json TEXT NOT NULL DEFAULT '[]',
  request_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_media_generations_provider_task
  ON ai_media_generations(provider, task_id);

CREATE INDEX IF NOT EXISTS idx_ai_media_generations_org_created
  ON ai_media_generations(organization_id, created_at);


ALTER TABLE chat_sessions ADD COLUMN memory_summary TEXT;
ALTER TABLE chat_sessions ADD COLUMN model TEXT;
ALTER TABLE chat_sessions ADD COLUMN context_sources_json TEXT;

CREATE TABLE IF NOT EXISTS assistant_memories (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'user',
  memory_key TEXT NOT NULL,
  memory_value TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'chat',
  confidence INTEGER NOT NULL DEFAULT 70,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assistant_memories_member ON assistant_memories(organization_id, member_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_assistant_memories_scope ON assistant_memories(organization_id, scope, updated_at);

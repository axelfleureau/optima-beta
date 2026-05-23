PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS ai_feedback (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  message_id TEXT NOT NULL,
  session_id TEXT,
  feedback TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_org_created
  ON ai_feedback(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_session
  ON ai_feedback(organization_id, session_id);

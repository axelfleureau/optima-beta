CREATE TABLE IF NOT EXISTS telegram_authorized_chats (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  chat_id TEXT NOT NULL,
  telegram_user_id TEXT,
  username TEXT,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  permissions_json TEXT,
  last_seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_authorized_chats_chat
  ON telegram_authorized_chats(chat_id, status);

CREATE INDEX IF NOT EXISTS idx_telegram_authorized_chats_member
  ON telegram_authorized_chats(organization_id, member_id, updated_at);

CREATE TABLE IF NOT EXISTS telegram_conversation_memory (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  chat_id TEXT NOT NULL,
  memory_summary TEXT,
  preferences_json TEXT,
  last_result_json TEXT,
  recent_turns_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, member_id, chat_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_conversation_memory_chat
  ON telegram_conversation_memory(organization_id, chat_id, updated_at);

CREATE TABLE IF NOT EXISTS telegram_document_proposals (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  chat_id TEXT NOT NULL,
  telegram_file_id TEXT,
  file_name TEXT,
  mime_type TEXT,
  extracted_text TEXT,
  classification_json TEXT,
  status TEXT NOT NULL DEFAULT 'review',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telegram_document_proposals_review
  ON telegram_document_proposals(organization_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_telegram_document_proposals_chat
  ON telegram_document_proposals(organization_id, chat_id, created_at);

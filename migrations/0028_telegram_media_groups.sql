ALTER TABLE telegram_document_proposals ADD COLUMN media_group_id TEXT;
ALTER TABLE telegram_document_proposals ADD COLUMN telegram_message_id TEXT;

CREATE INDEX IF NOT EXISTS idx_telegram_document_proposals_media_group
  ON telegram_document_proposals(organization_id, chat_id, media_group_id, created_at);

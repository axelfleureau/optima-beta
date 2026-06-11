ALTER TABLE quotes ADD COLUMN share_token TEXT;
ALTER TABLE quotes ADD COLUMN sent_at TEXT;
ALTER TABLE quotes ADD COLUMN approved_at TEXT;
ALTER TABLE quotes ADD COLUMN approved_by_name TEXT;
ALTER TABLE quotes ADD COLUMN approved_by_email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_share_token ON quotes(share_token);

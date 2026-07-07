CREATE TABLE IF NOT EXISTS client_credit_transactions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  description TEXT,
  statement_month TEXT NOT NULL,
  occurred_on TEXT NOT NULL,
  receipt_r2_key TEXT,
  receipt_file_name TEXT,
  receipt_content_type TEXT,
  receipt_size INTEGER NOT NULL DEFAULT 0,
  created_by_member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  created_by_role TEXT,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_client_credit_transactions_client
  ON client_credit_transactions (organization_id, client_id, occurred_on DESC);

CREATE INDEX IF NOT EXISTS idx_client_credit_transactions_month
  ON client_credit_transactions (organization_id, client_id, statement_month);

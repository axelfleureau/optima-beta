ALTER TABLE time_entries ADD COLUMN client_id TEXT REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_client_date
  ON time_entries(organization_id, client_id, entry_date);

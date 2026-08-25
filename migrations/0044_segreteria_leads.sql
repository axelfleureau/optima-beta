-- Tracciamento dei messaggi arrivati dalla segreteria telefonica.
-- Serve all'idempotenza: ElevenLabs ritenta i webhook falliti, e senza una
-- chiave stabile lo stesso messaggio creerebbe due volte cliente e task.
CREATE TABLE IF NOT EXISTS segreteria_leads (
  conversation_id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id TEXT,
  task_id TEXT,
  client_created INTEGER NOT NULL DEFAULT 0,
  skipped TEXT,
  categoria TEXT,
  urgenza TEXT,
  caller_number TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_segreteria_leads_org_created
  ON segreteria_leads(organization_id, created_at);

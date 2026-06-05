CREATE TABLE IF NOT EXISTS agent_runner_heartbeats (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'offline',
  mode TEXT,
  version TEXT,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_claim_at TEXT,
  last_error_at TEXT,
  last_error_message TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_runner_heartbeats_last_seen
  ON agent_runner_heartbeats (last_seen_at DESC);

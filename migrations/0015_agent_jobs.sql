CREATE TABLE IF NOT EXISTS agent_jobs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  created_by_member_id TEXT,
  assigned_runner TEXT NOT NULL DEFAULT 'codex-vps',
  title TEXT NOT NULL,
  job_type TEXT NOT NULL DEFAULT 'general',
  brief TEXT NOT NULL,
  context_summary TEXT NOT NULL DEFAULT '',
  repo_url TEXT,
  repo_branch TEXT,
  workspace_hint TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  priority INTEGER NOT NULL DEFAULT 3,
  input_json TEXT NOT NULL DEFAULT '{}',
  context_r2_key TEXT,
  result_r2_key TEXT,
  result_summary TEXT,
  error_message TEXT,
  claimed_by TEXT,
  approved_by_member_id TEXT,
  approved_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_org_status
  ON agent_jobs (organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_queue
  ON agent_jobs (status, priority, created_at);

CREATE TABLE IF NOT EXISTS agent_job_events (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  actor_member_id TEXT,
  actor_type TEXT NOT NULL DEFAULT 'system',
  event_type TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES agent_jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_job_events_job
  ON agent_job_events (job_id, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_job_artifacts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  artifact_type TEXT NOT NULL DEFAULT 'report',
  label TEXT NOT NULL,
  url TEXT,
  r2_key TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES agent_jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agent_job_artifacts_job
  ON agent_job_artifacts (job_id, created_at DESC);

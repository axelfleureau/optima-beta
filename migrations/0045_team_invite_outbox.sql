CREATE TABLE IF NOT EXISTS team_invite_outbox (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL,
  inviter_name TEXT NOT NULL,
  inviter_email TEXT NOT NULL,
  organization_name TEXT NOT NULL,
  custom_message TEXT,
  accept_url TEXT NOT NULL,
  login_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  claimed_at TEXT,
  sent_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_invite_outbox_due
  ON team_invite_outbox (status, next_attempt_at, created_at);

CREATE INDEX IF NOT EXISTS idx_team_invite_outbox_member
  ON team_invite_outbox (organization_id, member_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_invite_outbox_one_open
  ON team_invite_outbox (organization_id, member_id)
  WHERE status IN ('pending', 'processing', 'failed');

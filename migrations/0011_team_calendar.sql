CREATE TABLE IF NOT EXISTS team_calendar_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_type TEXT NOT NULL DEFAULT 'meeting',
  status TEXT NOT NULL DEFAULT 'confirmed',
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  all_day INTEGER NOT NULL DEFAULT 0,
  client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  owner_member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  created_by_member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  attendees_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_calendar_org_start ON team_calendar_events(organization_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_team_calendar_project ON team_calendar_events(project_id);
CREATE INDEX IF NOT EXISTS idx_team_calendar_owner ON team_calendar_events(owner_member_id);

CREATE TABLE IF NOT EXISTS team_calendar_feeds (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL DEFAULT 'team',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_calendar_feeds_org ON team_calendar_feeds(organization_id);

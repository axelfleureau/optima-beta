CREATE TABLE IF NOT EXISTS work_days (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  entry_date TEXT NOT NULL,
  check_in_at TEXT,
  check_out_at TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  absence_reason TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (organization_id, member_id, entry_date)
);

CREATE INDEX IF NOT EXISTS idx_work_days_org_date ON work_days(organization_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_work_days_member_date ON work_days(member_id, entry_date);

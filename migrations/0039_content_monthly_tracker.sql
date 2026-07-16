CREATE TABLE IF NOT EXISTS content_monthly_plans (
  id                         TEXT PRIMARY KEY,
  organization_id            TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id                  TEXT REFERENCES clients(id) ON DELETE SET NULL,
  client_name_snapshot       TEXT NOT NULL,
  month                      TEXT NOT NULL,
  target_video_reel          INTEGER NOT NULL DEFAULT 0,
  target_photo_post          INTEGER NOT NULL DEFAULT 0,
  target_generic             INTEGER NOT NULL DEFAULT 0,
  created_video_reel         INTEGER NOT NULL DEFAULT 0,
  created_photo_post         INTEGER NOT NULL DEFAULT 0,
  created_generic            INTEGER NOT NULL DEFAULT 0,
  planned_missing_reel       INTEGER NOT NULL DEFAULT 0,
  planned_missing_post       INTEGER NOT NULL DEFAULT 0,
  notes                      TEXT,
  created_by_member_id       TEXT REFERENCES members(id) ON DELETE SET NULL,
  updated_by_member_id       TEXT REFERENCES members(id) ON DELETE SET NULL,
  created_at                 TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                 TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_content_monthly_plans_client_month
  ON content_monthly_plans(organization_id, month, client_id)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_monthly_plans_org_month
  ON content_monthly_plans(organization_id, month);

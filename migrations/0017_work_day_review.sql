ALTER TABLE work_days ADD COLUMN review_status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE work_days ADD COLUMN submitted_at TEXT;
ALTER TABLE work_days ADD COLUMN submitted_by_member_id TEXT;
ALTER TABLE work_days ADD COLUMN reviewed_at TEXT;
ALTER TABLE work_days ADD COLUMN reviewed_by_member_id TEXT;
ALTER TABLE work_days ADD COLUMN review_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_work_days_review
  ON work_days(organization_id, review_status, entry_date);

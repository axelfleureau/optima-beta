ALTER TABLE time_entries ADD COLUMN review_status TEXT NOT NULL DEFAULT 'submitted';
ALTER TABLE time_entries ADD COLUMN submitted_at TEXT;
ALTER TABLE time_entries ADD COLUMN submitted_by_member_id TEXT;
ALTER TABLE time_entries ADD COLUMN reviewed_at TEXT;
ALTER TABLE time_entries ADD COLUMN reviewed_by_member_id TEXT;
ALTER TABLE time_entries ADD COLUMN review_notes TEXT;

UPDATE time_entries
SET review_status = 'approved',
    submitted_at = COALESCE(submitted_at, created_at),
    reviewed_at = COALESCE(approved_at, updated_at),
    reviewed_by_member_id = approved_by_member_id
WHERE review_status IS NULL OR review_status = 'submitted';

UPDATE time_entries
SET review_status = 'submitted',
    reviewed_at = NULL,
    reviewed_by_member_id = NULL,
    review_notes = NULL
WHERE EXISTS (
  SELECT 1
  FROM work_days wd
  WHERE wd.organization_id = time_entries.organization_id
    AND wd.member_id = time_entries.member_id
    AND wd.entry_date = time_entries.entry_date
    AND wd.review_status = 'submitted'
);

UPDATE time_entries
SET review_status = 'changes_requested',
    reviewed_at = (
      SELECT wd.reviewed_at
      FROM work_days wd
      WHERE wd.organization_id = time_entries.organization_id
        AND wd.member_id = time_entries.member_id
        AND wd.entry_date = time_entries.entry_date
      LIMIT 1
    ),
    reviewed_by_member_id = (
      SELECT wd.reviewed_by_member_id
      FROM work_days wd
      WHERE wd.organization_id = time_entries.organization_id
        AND wd.member_id = time_entries.member_id
        AND wd.entry_date = time_entries.entry_date
      LIMIT 1
    ),
    review_notes = (
      SELECT wd.review_notes
      FROM work_days wd
      WHERE wd.organization_id = time_entries.organization_id
        AND wd.member_id = time_entries.member_id
        AND wd.entry_date = time_entries.entry_date
      LIMIT 1
    )
WHERE EXISTS (
  SELECT 1
  FROM work_days wd
  WHERE wd.organization_id = time_entries.organization_id
    AND wd.member_id = time_entries.member_id
    AND wd.entry_date = time_entries.entry_date
    AND wd.review_status = 'changes_requested'
);

CREATE INDEX IF NOT EXISTS idx_time_entries_review
  ON time_entries(organization_id, review_status, entry_date);

CREATE INDEX IF NOT EXISTS idx_time_entries_member_day_review
  ON time_entries(organization_id, member_id, entry_date, review_status);

ALTER TABLE tasks ADD COLUMN work_mode TEXT NOT NULL DEFAULT 'office';
ALTER TABLE time_entries ADD COLUMN work_mode TEXT NOT NULL DEFAULT 'office';

CREATE INDEX IF NOT EXISTS idx_tasks_work_mode
  ON tasks (organization_id, work_mode);

CREATE INDEX IF NOT EXISTS idx_time_entries_work_mode
  ON time_entries (organization_id, entry_date, work_mode);

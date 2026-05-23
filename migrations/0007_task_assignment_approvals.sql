ALTER TABLE tasks ADD COLUMN assignment_status TEXT DEFAULT 'accepted';
ALTER TABLE tasks ADD COLUMN assignment_requested_by_member_id TEXT REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN assignment_requested_at TEXT;
ALTER TABLE tasks ADD COLUMN assignment_responded_at TEXT;
ALTER TABLE tasks ADD COLUMN assignment_rejection_reason TEXT;

UPDATE tasks
SET assignment_status = 'accepted'
WHERE assignment_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_org_assignment_status
  ON tasks(organization_id, assignment_status);

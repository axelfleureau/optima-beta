ALTER TABLE tasks ADD COLUMN column_id TEXT;
ALTER TABLE tasks ADD COLUMN client_id TEXT;
ALTER TABLE tasks ADD COLUMN client_name TEXT;
ALTER TABLE tasks ADD COLUMN type TEXT;
ALTER TABLE tasks ADD COLUMN score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN rich_description TEXT;
ALTER TABLE tasks ADD COLUMN assignee_name TEXT;
ALTER TABLE tasks ADD COLUMN tags_json TEXT;
ALTER TABLE tasks ADD COLUMN attachments_json TEXT;
ALTER TABLE tasks ADD COLUMN comments_json TEXT;
ALTER TABLE tasks ADD COLUMN sub_items_json TEXT;
ALTER TABLE tasks ADD COLUMN parent_item_id TEXT;
ALTER TABLE tasks ADD COLUMN created_by_member_id TEXT REFERENCES members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_org_client ON tasks(organization_id, client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_column ON tasks(organization_id, column_id);

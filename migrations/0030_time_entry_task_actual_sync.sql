DROP TRIGGER IF EXISTS trg_time_entries_sync_task_actual_insert;
DROP TRIGGER IF EXISTS trg_time_entries_sync_task_actual_update;
DROP TRIGGER IF EXISTS trg_time_entries_sync_task_actual_delete;

CREATE TRIGGER trg_time_entries_sync_task_actual_insert
AFTER INSERT ON time_entries
WHEN NEW.task_id IS NOT NULL AND NEW.task_id <> ''
BEGIN
  UPDATE tasks
  SET actual_minutes = (
        SELECT COALESCE(SUM(minutes), 0)
        FROM time_entries
        WHERE organization_id = NEW.organization_id
          AND task_id = NEW.task_id
      ),
      updated_at = CURRENT_TIMESTAMP
  WHERE organization_id = NEW.organization_id
    AND id = NEW.task_id;
END;

CREATE TRIGGER trg_time_entries_sync_task_actual_update
AFTER UPDATE OF organization_id, task_id, minutes ON time_entries
BEGIN
  UPDATE tasks
  SET actual_minutes = (
        SELECT COALESCE(SUM(minutes), 0)
        FROM time_entries
        WHERE organization_id = OLD.organization_id
          AND task_id = OLD.task_id
      ),
      updated_at = CURRENT_TIMESTAMP
  WHERE OLD.task_id IS NOT NULL
    AND OLD.task_id <> ''
    AND organization_id = OLD.organization_id
    AND id = OLD.task_id;

  UPDATE tasks
  SET actual_minutes = (
        SELECT COALESCE(SUM(minutes), 0)
        FROM time_entries
        WHERE organization_id = NEW.organization_id
          AND task_id = NEW.task_id
      ),
      updated_at = CURRENT_TIMESTAMP
  WHERE NEW.task_id IS NOT NULL
    AND NEW.task_id <> ''
    AND organization_id = NEW.organization_id
    AND id = NEW.task_id;
END;

CREATE TRIGGER trg_time_entries_sync_task_actual_delete
AFTER DELETE ON time_entries
WHEN OLD.task_id IS NOT NULL AND OLD.task_id <> ''
BEGIN
  UPDATE tasks
  SET actual_minutes = (
        SELECT COALESCE(SUM(minutes), 0)
        FROM time_entries
        WHERE organization_id = OLD.organization_id
          AND task_id = OLD.task_id
      ),
      updated_at = CURRENT_TIMESTAMP
  WHERE organization_id = OLD.organization_id
    AND id = OLD.task_id;
END;

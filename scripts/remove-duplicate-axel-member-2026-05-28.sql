-- Remove the historical duplicate Axel invite record.
-- Canonical member: mem_axel_wearerighello / axel@wearerighello.com.

PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO project_members (project_id, member_id, organization_id, role)
SELECT project_id, 'mem_axel_wearerighello', organization_id, role
FROM project_members
WHERE member_id = 'mem_axel_fleureau';

DELETE FROM project_members
WHERE member_id = 'mem_axel_fleureau';

UPDATE tasks
SET assignee_member_id = 'mem_axel_wearerighello'
WHERE assignee_member_id = 'mem_axel_fleureau';

UPDATE tasks
SET created_by_member_id = 'mem_axel_wearerighello'
WHERE created_by_member_id = 'mem_axel_fleureau';

UPDATE tasks
SET assignment_requested_by_member_id = 'mem_axel_wearerighello'
WHERE assignment_requested_by_member_id = 'mem_axel_fleureau';

UPDATE time_entries
SET member_id = 'mem_axel_wearerighello'
WHERE member_id = 'mem_axel_fleureau';

UPDATE notifications
SET member_id = 'mem_axel_wearerighello'
WHERE member_id = 'mem_axel_fleureau';

UPDATE notifications
SET actor_member_id = 'mem_axel_wearerighello'
WHERE actor_member_id = 'mem_axel_fleureau';

DELETE FROM members
WHERE id = 'mem_axel_fleureau'
   OR lower(email) = lower('fleureau.axel@gmail.com');

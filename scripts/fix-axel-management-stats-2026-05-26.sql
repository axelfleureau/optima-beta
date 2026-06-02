-- Consolidate Axel operational data on the active production member.
-- This fixes management stats where recent time entries existed but the
-- personal monitoring card showed 0h because entries were tied to an invited alias.

UPDATE members
SET first_name = 'Axel',
    last_name = 'Fleureau',
    weekly_capacity_minutes = 2400,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'mem_axel_wearerighello'
  AND organization_id = 'org_demo_righello';

UPDATE time_entries
SET member_id = 'mem_axel_wearerighello'
WHERE organization_id = 'org_demo_righello'
  AND member_id = 'mem_axel_fleureau';

UPDATE tasks
SET assignee_member_id = 'mem_axel_wearerighello',
    assignee_name = 'Axel Fleureau',
    created_by_member_id = CASE
      WHEN created_by_member_id = 'mem_axel_fleureau' THEN 'mem_axel_wearerighello'
      ELSE created_by_member_id
    END,
    assignment_requested_by_member_id = CASE
      WHEN assignment_requested_by_member_id = 'mem_axel_fleureau' THEN 'mem_axel_wearerighello'
      ELSE assignment_requested_by_member_id
    END,
    updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND (
    assignee_member_id = 'mem_axel_fleureau'
    OR created_by_member_id = 'mem_axel_fleureau'
    OR assignment_requested_by_member_id = 'mem_axel_fleureau'
  );

UPDATE project_members
SET member_id = 'mem_axel_wearerighello'
WHERE organization_id = 'org_demo_righello'
  AND member_id = 'mem_axel_fleureau'
  AND NOT EXISTS (
    SELECT 1
      FROM project_members existing
     WHERE existing.organization_id = project_members.organization_id
       AND existing.project_id = project_members.project_id
       AND existing.member_id = 'mem_axel_wearerighello'
  );

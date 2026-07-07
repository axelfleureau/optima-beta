-- Normalizza account operativi finiti in workspace personali vuoti.
-- Condizioni conservative:
-- - solo membri attivi con ruolo operativo
-- - solo workspace non Righello senza clienti/progetti/task/rapportini
-- - nessun duplicato email o clerk_user_id gia presente in Righello

UPDATE members
SET
  organization_id = 'org_demo_righello',
  updated_at = CURRENT_TIMESTAMP
WHERE organization_id <> 'org_demo_righello'
  AND COALESCE(status, 'active') = 'active'
  AND role IN ('junior', 'member', 'dipendente', 'employee')
  AND NOT EXISTS (
    SELECT 1
    FROM members existing
    WHERE existing.organization_id = 'org_demo_righello'
      AND lower(existing.email) = lower(members.email)
  )
  AND NOT EXISTS (
    SELECT 1
    FROM members existing
    WHERE existing.organization_id = 'org_demo_righello'
      AND existing.clerk_user_id = members.clerk_user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM clients c WHERE c.organization_id = members.organization_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM projects p WHERE p.organization_id = members.organization_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM tasks t WHERE t.organization_id = members.organization_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM time_entries te WHERE te.organization_id = members.organization_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM work_days wd WHERE wd.organization_id = members.organization_id
  );

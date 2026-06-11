-- Mark Fatin Lachhab absent on 2026-06-10.
-- Idempotent production data repair: lookup the real member by name/email.

INSERT INTO work_days (
  id,
  organization_id,
  member_id,
  entry_date,
  check_in_at,
  check_out_at,
  status,
  absence_reason,
  notes,
  created_at,
  updated_at
)
SELECT
  'day_fatin_lachhab_20260610_absent',
  organization_id,
  id,
  '2026-06-10',
  NULL,
  NULL,
  'absent',
  'Assenza',
  'Correzione direzione: assenza Fatin Lachhab per mercoledi 10 giugno 2026.',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM members
WHERE organization_id = 'org_demo_righello'
  AND status = 'active'
  AND (
    lower(coalesce(first_name, '') || ' ' || coalesce(last_name, '')) LIKE '%fatin%'
    OR lower(email) LIKE '%fatin%'
  )
ORDER BY
  CASE
    WHEN lower(coalesce(first_name, '') || ' ' || coalesce(last_name, '')) LIKE '%fatin%lachhab%' THEN 0
    ELSE 1
  END
LIMIT 1
ON CONFLICT(organization_id, member_id, entry_date) DO UPDATE SET
  check_in_at = NULL,
  check_out_at = NULL,
  status = 'absent',
  absence_reason = 'Assenza',
  notes = 'Correzione direzione: assenza Fatin Lachhab per mercoledi 10 giugno 2026.',
  updated_at = CURRENT_TIMESTAMP;

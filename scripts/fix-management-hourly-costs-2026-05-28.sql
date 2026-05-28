-- Normalize management hourly costs.
-- Controllo Aziendale uses hourly_rate_cents as internal labor cost, not client list price.

UPDATE members
SET hourly_rate_cents = 4500,
    updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND id IN ('mem_axel_wearerighello', 'mem_axel_fleureau')
  AND hourly_rate_cents > 4500;

UPDATE members
SET hourly_rate_cents = 2200,
    updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND role IN ('junior', 'dipendente', 'employee', 'member')
  AND hourly_rate_cents = 0;

UPDATE members
SET hourly_rate_cents = 4500,
    updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND role IN ('super-admin', 'admin', 'direzione')
  AND hourly_rate_cents = 0;

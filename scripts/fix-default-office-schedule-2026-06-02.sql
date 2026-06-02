-- Normalizza la capacità operativa standard Righello.
-- In Optima weekly_capacity_minutes rappresenta ore nette di lavoro settimanali.
-- Default: 40h nette/settimana, giornata ufficio 09:00-18:00 con 1h pausa pranzo.

UPDATE members
SET weekly_capacity_minutes = 2400,
    updated_at = CURRENT_TIMESTAMP
WHERE organization_id = 'org_demo_righello'
  AND status IN ('active', 'invited', 'pending', 'inactive')
  AND COALESCE(weekly_capacity_minutes, 0) < 2400;

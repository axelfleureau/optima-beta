-- Script per aggiornare la struttura del database con i nuovi ruoli e permessi

-- 1. Aggiorna la struttura users per supportare i nuovi ruoli
-- Questo script è indicativo per la migrazione dei dati esistenti

-- Esempio di aggiornamento per utenti esistenti:
-- UPDATE users SET role = 'admin' WHERE role IS NULL OR role = 'user';
-- UPDATE users SET parentTenantId = NULL WHERE role = 'admin';

-- 2. Aggiungi campi mancanti per la gestione dei permessi
-- ALTER TABLE users ADD COLUMN assignedClientIds ARRAY;
-- ALTER TABLE users ADD COLUMN isSuspended BOOLEAN DEFAULT FALSE;

-- 3. Aggiorna la struttura tasks per supportare assignedUserId
-- ALTER TABLE tasks ADD COLUMN assignedUserId VARCHAR(255);

-- 4. Migrazione dati esistenti
-- UPDATE tasks SET assignedUserId = tenantId WHERE assignee IS NOT NULL;

-- 5. Crea indici per migliorare le performance
-- CREATE INDEX idx_users_role ON users(role);
-- CREATE INDEX idx_users_parent_tenant ON users(parentTenantId);
-- CREATE INDEX idx_tasks_assigned_user ON tasks(assignedUserId);
-- CREATE INDEX idx_tasks_client_tenant ON tasks(tenantId, clientId);

-- Note: Questo script è indicativo per database SQL.
-- Per Firestore, le migrazioni devono essere gestite tramite script JavaScript/TypeScript
-- che aggiornano i documenti esistenti con i nuovi campi.

SELECT 'Migration script completed' as status;

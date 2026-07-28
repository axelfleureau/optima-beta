-- Gerarchia clienti: un'azienda può possederne un'altra (es. Systemdoc possiede
-- Dico). parent_client_id = holding/azienda madre. Piatto = parent NULL.
ALTER TABLE clients ADD COLUMN parent_client_id TEXT;
CREATE INDEX IF NOT EXISTS idx_clients_parent ON clients(organization_id, parent_client_id);

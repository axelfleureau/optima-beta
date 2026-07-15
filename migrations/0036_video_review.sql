-- Modulo Video Review dentro Optima.
-- Clienti / progetti / task / membri restano NATIVI (tabelle esistenti):
-- qui vivono solo tranche, video (metadati) e marker. I byte stanno sul nodo
-- locale (Mac Studio) e si raggiungono via URL firmati; `storage_key` è il
-- percorso relativo del file, opaco per Optima.

CREATE TABLE IF NOT EXISTS vr_tranches (
  id                    TEXT PRIMARY KEY,
  organization_id       TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id             TEXT,                  -- clients.id (nativo)
  project_id            TEXT,                  -- projects.id (nativo)
  title                 TEXT NOT NULL,
  token                 TEXT NOT NULL UNIQUE,  -- link di review pubblico
  editor_member_id      TEXT,                  -- members.id: assegnatario task revisione
  smm_member_id         TEXT,                  -- members.id: destinatario notifica approvazione
  status                TEXT NOT NULL DEFAULT 'open',
  created_by_member_id  TEXT,
  created_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vr_videos (
  id                    TEXT PRIMARY KEY,
  organization_id       TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tranche_id            TEXT NOT NULL REFERENCES vr_tranches(id) ON DELETE CASCADE,
  client_id             TEXT,                  -- denormalizzato per query
  title                 TEXT NOT NULL,
  filename              TEXT NOT NULL,
  storage_key           TEXT NOT NULL,         -- path relativo sul nodo (WD/T5)
  source                TEXT NOT NULL DEFAULT 'watch',   -- watch | upload
  status                TEXT NOT NULL DEFAULT 'pending', -- pending | approved | revision
  planned_publish_date  TEXT,
  fps                   REAL,
  duration_seconds      REAL,
  description           TEXT,                  -- caption scritta dallo SMM
  published             INTEGER NOT NULL DEFAULT 0,
  published_at          TEXT,
  approved_key          TEXT,                  -- path relativo copia approvata
  task_id               TEXT,                  -- tasks.id creato alla revisione (nativo)
  decided_at            TEXT,
  created_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vr_markers (
  id          TEXT PRIMARY KEY,
  video_id    TEXT NOT NULL REFERENCES vr_videos(id) ON DELETE CASCADE,
  t_seconds   REAL NOT NULL,
  note        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT 'Blue',
  author      TEXT NOT NULL DEFAULT 'client',
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vr_tranches_org     ON vr_tranches(organization_id);
CREATE INDEX IF NOT EXISTS idx_vr_tranches_client  ON vr_tranches(client_id);
CREATE INDEX IF NOT EXISTS idx_vr_tranches_token   ON vr_tranches(token);
CREATE INDEX IF NOT EXISTS idx_vr_videos_tranche   ON vr_videos(tranche_id);
CREATE INDEX IF NOT EXISTS idx_vr_videos_status    ON vr_videos(organization_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_vr_videos_key ON vr_videos(organization_id, storage_key);
CREATE INDEX IF NOT EXISTS idx_vr_markers_video    ON vr_markers(video_id);

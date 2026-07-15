-- Video Review: collaboratori, versioni, marker "fatto", dimensioni video.
--
-- VISIBILITÀ: il menu resta per tutti, ma i CONTENUTI si vedono solo se si è
-- coinvolti. I ruoli manageriali (super-admin/admin/direzione/capo-reparto)
-- vedono tutto. Gli altri vedono le tranche/video dove sono collaboratori.
-- Chiunque sia coinvolto può aggiungerne altri (superiore→subordinato e tra pari).

CREATE TABLE IF NOT EXISTS vr_collaborators (
  id                  TEXT PRIMARY KEY,
  organization_id     TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scope               TEXT NOT NULL,   -- 'tranche' | 'video'
  scope_id            TEXT NOT NULL,   -- vr_tranches.id | vr_videos.id
  member_id           TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  role                TEXT NOT NULL,   -- 'videomaker' | 'smm' | 'revisore' | 'osservatore'
  added_by_member_id  TEXT,
  created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (scope, scope_id, member_id, role)
);
CREATE INDEX IF NOT EXISTS idx_vr_collab_member ON vr_collaborators(organization_id, member_id);
CREATE INDEX IF NOT EXISTS idx_vr_collab_scope  ON vr_collaborators(scope, scope_id);

-- Video: progetto anche sul singolo video, versioni, dimensioni reali (player 9:16).
ALTER TABLE vr_videos ADD COLUMN project_id      TEXT;
ALTER TABLE vr_videos ADD COLUMN version         INTEGER NOT NULL DEFAULT 1;
ALTER TABLE vr_videos ADD COLUMN parent_video_id TEXT;
ALTER TABLE vr_videos ADD COLUMN width           INTEGER;
ALTER TABLE vr_videos ADD COLUMN height          INTEGER;

-- Marker: stato "fatto" (sincronizzato con i sub-item del task nel Workspace).
ALTER TABLE vr_markers ADD COLUMN done               INTEGER NOT NULL DEFAULT 0;
ALTER TABLE vr_markers ADD COLUMN done_at            TEXT;
ALTER TABLE vr_markers ADD COLUMN done_by_member_id  TEXT;

-- Migra le assegnazioni singole esistenti nel nuovo modello a N collaboratori.
INSERT OR IGNORE INTO vr_collaborators (id, organization_id, scope, scope_id, member_id, role, added_by_member_id)
SELECT lower(hex(randomblob(16))), organization_id, 'tranche', id, videomaker_member_id, 'videomaker', created_by_member_id
  FROM vr_tranches WHERE videomaker_member_id IS NOT NULL;

INSERT OR IGNORE INTO vr_collaborators (id, organization_id, scope, scope_id, member_id, role, added_by_member_id)
SELECT lower(hex(randomblob(16))), organization_id, 'tranche', id, smm_member_id, 'smm', created_by_member_id
  FROM vr_tranches WHERE smm_member_id IS NOT NULL;

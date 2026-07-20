-- Estende Video Review a Post Review mantenendo le tabelle legacy vr_*.
ALTER TABLE vr_tranches ADD COLUMN post_type TEXT NOT NULL DEFAULT 'video';

ALTER TABLE vr_videos ADD COLUMN media_type TEXT NOT NULL DEFAULT 'video';
ALTER TABLE vr_videos ADD COLUMN mime_type TEXT;
ALTER TABLE vr_videos ADD COLUMN file_size INTEGER;
ALTER TABLE vr_videos ADD COLUMN slide_index INTEGER;

CREATE INDEX IF NOT EXISTS idx_vr_videos_media_type
  ON vr_videos(organization_id, media_type);

CREATE INDEX IF NOT EXISTS idx_vr_videos_tranche_slide
  ON vr_videos(tranche_id, slide_index);

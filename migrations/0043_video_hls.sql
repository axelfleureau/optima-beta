-- Streaming HLS adattivo per i video di Post Review.
--
-- L'MP4 originale resta SEMPRE la fonte di verità (download, archivio, e via
-- di riserva del player). L'HLS si aggiunge accanto: se manca o fallisce, il
-- player torna all'MP4 progressivo senza che nessuno se ne accorga.
--
--   hls_key    = chiave del master.m3u8 (percorso relativo, come storage_key)
--   hls_status = null | 'queued' | 'running' | 'ready' | 'failed'
--   hls_error  = messaggio dell'ultimo tentativo fallito (per il presidio)

ALTER TABLE vr_videos ADD COLUMN hls_key TEXT;
ALTER TABLE vr_videos ADD COLUMN hls_status TEXT;
ALTER TABLE vr_videos ADD COLUMN hls_error TEXT;

-- Serve al job di conversione per pescare i video da fare / ritentare.
CREATE INDEX IF NOT EXISTS idx_vr_videos_hls_status
  ON vr_videos(organization_id, hls_status);

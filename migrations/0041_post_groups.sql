-- Raggruppa i media in POST.
--
-- Prima ogni file caricato era una riga a sé: un carosello di 3 immagini
-- appariva come 3 card separate, e due caroselli nella stessa consegna erano
-- indistinguibili. post_group_id lega i file caricati insieme in un solo post.
--
-- Il tipo del post NON viene salvato: si deriva dal gruppo (1 video = video,
-- 1 immagine = image, N immagini = carousel) così non può andare fuori sync.

ALTER TABLE vr_videos ADD COLUMN post_group_id TEXT;

-- Backfill: ogni media esistente diventa un post a sé (nessun carosello reale
-- ancora presente in produzione).
UPDATE vr_videos SET post_group_id = id WHERE post_group_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_vr_videos_post_group
  ON vr_videos(tranche_id, post_group_id, slide_index);

-- Poster (frame JPG) del video, servito come anteprima social (og:image WhatsApp).
--
-- I video R2 non passano dal nodo, quindi signedThumbUrl non ha una thumbnail da
-- puntare: senza un poster salvato in R2 l'anteprima cadeva sul placeholder.
-- poster_key = chiave r2:// dell'immagine di copertina, servita dal media proxy
-- (pubblico e firmato), quindi raggiungibile dai crawler di WhatsApp/Telegram.

ALTER TABLE vr_videos ADD COLUMN poster_key TEXT;

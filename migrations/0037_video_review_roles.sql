-- Terminologia: sulla tranche l'assegnazione è PER NOMINATIVO (qualsiasi membro),
-- non un ruolo permanente: chiunque può essere videomaker o SMM, anche solo
-- occasionalmente. Il menu Video Review resta visibile a tutti gli utenti.
ALTER TABLE vr_tranches RENAME COLUMN editor_member_id TO videomaker_member_id;

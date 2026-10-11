-- La fin de parcours : ce qui se passe après le bilan.
--
-- L'objectif est que le participant prenne rendez-vous de lui-même. Le coach
-- ne relance à la main que ceux qui ne l'ont pas fait — c'est ce qui rend le
-- challenge réplicable au-delà d'une poignée de participants.
--
-- Les trois colonnes servent exactement à produire cette liste de relance.
-- Elles sont posées sur le bilan plutôt que dans une table à part : un
-- participant sans bilan n'atteint jamais cet écran, donc la ligne existe
-- toujours, et une table de plus n'aurait rien ajouté qu'une jointure.
--
-- `cta_clique_at` dit qu'il a cliqué, pas qu'il a réservé : la réservation a
-- lieu chez un prestataire externe, que cette application ne voit pas.
-- D'où `rdv_confirme_at`, que le coach coche lui-même quand le rendez-vous
-- apparaît dans son agenda. Confondre les deux lui ferait croire à des
-- rendez-vous qui n'existent pas.

ALTER TABLE reboot_bilans ADD COLUMN IF NOT EXISTS video_fin_vue_at TIMESTAMPTZ;
ALTER TABLE reboot_bilans ADD COLUMN IF NOT EXISTS cta_clique_at    TIMESTAMPTZ;
ALTER TABLE reboot_bilans ADD COLUMN IF NOT EXISTS rdv_confirme_at  TIMESTAMPTZ;

-- La relance du coach, pour ne pas écrire deux fois à la même personne.
ALTER TABLE reboot_bilans ADD COLUMN IF NOT EXISTS relance_at       TIMESTAMPTZ;

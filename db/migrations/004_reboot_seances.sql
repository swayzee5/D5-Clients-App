-- Section « séances » du Reboot 40 : onglets, et séances complètes.
--
-- Quatre onglets sont attendus côté app : en salle, à la maison, échauffements
-- et étirements, HIIT. Les deux derniers sont des vidéos à suivre telles
-- quelles, pas des séances de renforcement, et ne comptent pas dans l'objectif
-- de 3 séances du challenge — d'où `is_bonus`.
--
-- `slug` est la nouveauté importante. Sans identifiant stable, le seed
-- reconnaissait une séance à son groupe musculaire, ce qui ne permettait pas de
-- faire cohabiter la version salle et la version maison du même groupe, et
-- rendait impossible de compléter une séance existante : elle était simplement
-- sautée, et une séance née vide le restait indéfiniment.
--
-- `is_active` permet de retirer une séance de l'app sans la supprimer. Les
-- anciennes séances genrées (« Jambes Homme », « Jambes & Fessiers Femme »)
-- sont désactivées plutôt qu'effacées : reboot_completions les référence, et
-- une suppression effacerait en cascade les séances déjà validées par les
-- participants.
--
-- `library_exercise_id` relie l'exercice à la bibliothèque par sa clé plutôt
-- que par son nom. Le rapprochement par nom est ce qui laissait des exercices
-- sans vidéo dès qu'une orthographe différait d'un caractère.

ALTER TABLE reboot_sessions ADD COLUMN IF NOT EXISTS slug      TEXT;
ALTER TABLE reboot_sessions ADD COLUMN IF NOT EXISTS tab       TEXT NOT NULL DEFAULT 'salle';
ALTER TABLE reboot_sessions ADD COLUMN IF NOT EXISTS is_bonus  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE reboot_sessions ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Index unique non partiel : ON CONFLICT (slug) ne sait pas s'appuyer sur un
-- index partiel, et Postgres autorise de toute façon plusieurs NULL dans un
-- index unique — les anciennes séances sans slug cohabitent donc sans souci.
CREATE UNIQUE INDEX IF NOT EXISTS reboot_sessions_slug_key
  ON reboot_sessions (slug);

CREATE INDEX IF NOT EXISTS reboot_sessions_tab_idx
  ON reboot_sessions (tab, order_index) WHERE is_active;

ALTER TABLE reboot_exercises ADD COLUMN IF NOT EXISTS library_exercise_id UUID;

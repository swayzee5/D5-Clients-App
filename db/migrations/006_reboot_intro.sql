-- Vidéo d'explication du challenge, à voir avant d'accéder au contenu.
--
-- Sans elle, chacun découvre le déroulé par tâtonnement : un participant qui
-- ignore qu'il doit cocher ses exercices, poster dans le groupe et lire les
-- modules ne réclame pas d'explication — il fait ce qu'il comprend et s'arrête
-- à 6 sur 10.
--
-- `methode` distingue « regardée jusqu'au bout » de « lecture impossible ».
-- La seconde n'est pas un échec du participant : c'est au coach de lui envoyer
-- la vidéo en privé, encore faut-il qu'il sache de qui il s'agit.
--
-- L'identifiant Vimeo de la vidéo est réglé dans le CRM, dans app_settings
-- sous la clé reboot_intro_video_id. Tant qu'il est vide, la porte n'existe
-- pas : mieux vaut un challenge sans explication qu'un challenge inaccessible.

CREATE TABLE IF NOT EXISTS reboot_intro_views (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  methode    TEXT NOT NULL DEFAULT 'video',
  watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id)
);

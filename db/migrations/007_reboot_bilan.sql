-- Bilan de fin de challenge : les six mêmes notes qu'au départ.
--
-- Table séparée du diagnostic, et non une mise à jour. Le diagnostic est
-- enregistré une fois par personne ; écraser les notes de départ ferait
-- disparaître le point de comparaison, et l'écart est la seule chose que ce
-- challenge produise de durable. « Parti de 42, arrivé à 57 » est une phrase
-- qu'aucun argumentaire ne remplace, ni pour le participant ni pour le coach.
--
-- `temoignage_publiable` est l'autorisation explicite de publier la phrase.
-- Elle est demandée au moment où la personne l'écrit : revenir la chercher
-- plus tard est bien plus difficile, et publier sans demander n'est pas une
-- option.

CREATE TABLE IF NOT EXISTS reboot_bilans (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id            UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  ratings              JSONB NOT NULL,
  score_global         INT NOT NULL,
  score_sommeil        INT NOT NULL,
  score_energie        INT NOT NULL,
  score_recuperation   INT NOT NULL,
  score_stress         INT NOT NULL,
  score_motivation     INT NOT NULL,
  score_confiance      INT NOT NULL,
  satisfaction         INT,
  temoignage           TEXT,
  temoignage_publiable BOOLEAN NOT NULL DEFAULT false,
  submitted_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id)
);

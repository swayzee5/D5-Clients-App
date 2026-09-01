-- Diagnostic de départ du challenge Reboot 40.
--
-- Rempli une seule fois, avant d'accéder au challenge : d'où la contrainte
-- d'unicité sur client_id, qui rend aussi le test « a-t-il répondu ? » trivial
-- et empêche tout doublon si le formulaire est validé deux fois.
--
-- Les réponses brutes sont conservées en JSONB plutôt qu'en colonnes : le
-- diagnostic comporte surtout du texte libre, il évoluera, et une réponse
-- enregistrée doit rester lisible telle qu'elle a été donnée.
-- questionnaire_version dit quelle version des questions a été servie, sans
-- quoi on ne saurait plus à quoi correspond une réponse après une refonte.
--
-- Les six notes sont en revanche extraites en colonnes : ce sont elles qui
-- forment le Reboot Score, elles sont affichées et triées côté coach, et les
-- recalculer à chaque lecture reviendrait à figer la formule pour toujours.

CREATE TABLE IF NOT EXISTS reboot_diagnostics (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  answers               JSONB NOT NULL,

  -- Reboot Score : chaque axe sur 100, le global étant leur moyenne simple.
  score_global          INT NOT NULL,
  score_sommeil         INT NOT NULL,
  score_energie         INT NOT NULL,
  score_recuperation    INT NOT NULL,
  score_stress          INT NOT NULL,
  score_motivation      INT NOT NULL,
  score_confiance       INT NOT NULL,

  questionnaire_version INT NOT NULL DEFAULT 1,
  -- Permet au coach de distinguer les diagnostics déjà traités — celui dont le
  -- message vocal reste à enregistrer, notamment.
  is_read               BOOLEAN NOT NULL DEFAULT false,
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (client_id)
);

CREATE INDEX IF NOT EXISTS idx_reboot_diagnostics_unread
  ON reboot_diagnostics (is_read, submitted_at DESC);

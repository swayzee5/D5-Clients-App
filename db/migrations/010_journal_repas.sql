-- Le journal photo des repas.
--
-- Le plan alimentaire vivait dans un PDF : une fois téléchargé, le coach ne
-- savait plus s'il était lu, ne pouvait plus le corriger, et n'avait aucune
-- idée de ce que le client mangeait réellement. Le journal renverse le sens de
-- la circulation — c'est le client qui montre, et le coach qui répond.
--
-- Deux colonnes portent l'essentiel de la valeur, et ce ne sont pas celles de
-- l'analyse : `coach_seen_at` et `coach_replied_at`. Le client voit où en est
-- son repas, donc il sait qu'il n'écrit pas dans le vide. C'est aussi une
-- promesse opposable : un « Vu » suivi de trois jours de silence se remarque
-- davantage qu'un silence complet, et c'est voulu.
--
-- L'analyse automatique est stockée en JSON plutôt qu'en colonnes : sa forme
-- va bouger pendant les premières semaines, et faire une migration à chaque
-- ajustement du prompt n'aurait aucun sens. Ce qui est interrogé — l'attente,
-- le retard — est en colonnes.

CREATE TABLE IF NOT EXISTS meal_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Chemin de la photo dans le stockage de fichiers, et non son adresse
  -- publique : les photos sont déposées en accès privé et servies par une
  -- route qui vérifie la session. Ce sont les repas de quelqu'un, souvent sa
  -- cuisine et sa table — une adresse devinable ou partageable n'a pas sa
  -- place ici. L'image n'est jamais mise en base : quelques centaines de
  -- kilooctets par ligne rendraient la sauvegarde impraticable.
  photo_path       TEXT NOT NULL,

  -- Ce que le client ajoute de lui-même, facultatif. La plupart n'écriront
  -- rien, et c'est le but : un seul geste.
  note_client      TEXT,

  -- Lecture automatique de la photo. NULL tant qu'elle n'a pas tourné, ou si
  -- elle a échoué — auquel cas le repas arrive quand même chez le coach. Le
  -- service ne doit jamais dépendre de l'analyse.
  analyse_auto     JSONB,
  analyse_erreur   TEXT,

  -- Le suivi du coach. `seen` est posé à l'ouverture de la file, `replied` à
  -- l'envoi de la réponse ; les deux sont distincts parce que « j'ai vu » et
  -- « j'ai répondu » ne disent pas la même chose au client.
  coach_seen_at    TIMESTAMPTZ,
  coach_reply      TEXT,
  coach_replied_at TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- La file du coach, triée par ancienneté : l'index couvre la requête la plus
-- fréquente de tout le système, celle qui s'affiche à chaque ouverture du CRM.
CREATE INDEX IF NOT EXISTS meal_logs_attente_idx
  ON meal_logs (created_at)
  WHERE coach_replied_at IS NULL;

-- Le journal d'un client, du plus récent au plus ancien.
CREATE INDEX IF NOT EXISTS meal_logs_client_idx
  ON meal_logs (client_id, created_at DESC);

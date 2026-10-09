-- Le mini-point du mercredi.
--
-- La table existait déjà côté CRM, qui affiche ses lignes sur le tableau de
-- bord — mais rien dans l'app cliente ne l'alimentait. Le coach avait donc une
-- section qui ne pouvait jamais rien montrer.
--
-- Les trois questions du mini-point s'y ajoutent. « feeling » accueille ce qui
-- freine le participant, parce que c'est cette colonne que le CRM affiche
-- déjà : écrire ailleurs aurait demandé de retoucher le tableau de bord pour
-- un gain nul.

CREATE TABLE IF NOT EXISTS reboot_mid_checkins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     TEXT NOT NULL UNIQUE,
  energy        INT,
  sleep_quality INT,
  weight        DECIMAL(5,2),
  feeling       TEXT,
  submitted_at  TIMESTAMPTZ DEFAULT now()
);

-- Une séance faite hors de l'app : le participant doit pouvoir le dire, sinon
-- il répond « non » à une question dont il sait que la réponse est « oui ».
ALTER TABLE reboot_mid_checkins ADD COLUMN IF NOT EXISTS seance_faite BOOLEAN;
ALTER TABLE reboot_mid_checkins ADD COLUMN IF NOT EXISTS besoin_aide  TEXT;

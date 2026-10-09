-- Protéger les séances modifiées depuis le CRM.
--
-- Le catalogue écrit dans le code reconstruit les séances à chaque appel du
-- seed. Dès lors que le coach peut les modifier depuis le CRM, cette
-- reconstruction efface son travail sans prévenir — et il ne s'en aperçoit
-- qu'en ouvrant l'app, longtemps après.
--
-- Une séance touchée depuis le CRM porte donc cette marque, et le seed la
-- laisse telle quelle. Le catalogue du code redevient ce qu'il aurait toujours
-- dû être : un point de départ, pas une autorité permanente.
--
-- `?force=1` sur le seed passe outre, pour repartir volontairement du
-- catalogue.

ALTER TABLE reboot_sessions
  ADD COLUMN IF NOT EXISTS manually_edited BOOLEAN NOT NULL DEFAULT false;

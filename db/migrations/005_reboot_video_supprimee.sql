-- Retirer la vidéo d'un exercice de séance, explicitement.
--
-- Mettre library_exercise_id et vimeo_video_id à NULL ne suffit pas : faute de
-- lien, l'affichage retombe sur le rapprochement par nom, retrouve l'entrée de
-- la bibliothèque et fait revenir la vidéo écartée. Il faut donc dire que
-- l'absence est voulue, et non un simple manque d'information.
--
-- Sert quand la bibliothèque attribue la même vidéo à plusieurs exercices :
-- un seul la garde, les autres s'affichent sans démonstration plutôt qu'avec
-- celle d'un autre mouvement.

ALTER TABLE reboot_exercises
  ADD COLUMN IF NOT EXISTS video_suppressed BOOLEAN NOT NULL DEFAULT false;

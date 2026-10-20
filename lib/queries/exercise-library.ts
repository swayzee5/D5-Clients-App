/**
 * Jointure vers exercise_library garantissant AU PLUS une ligne par exercice.
 *
 * exercise_library.name n'a pas de contrainte d'unicite (migration 002 : simple
 * index). Un LEFT JOIN classique sur le nom renvoie donc autant de lignes qu'il
 * y a d'homonymes actifs, ce qui faisait apparaitre l'exercice plusieurs fois
 * dans la seance (fan-out de jointure).
 *
 * Le LATERAL ... LIMIT 1 borne le resultat a une ligne. Quand la colonne FK
 * library_exercise_id est renseignee, elle est utilisee en priorite : c'est le
 * lien fiable, le nom n'est qu'un repli.
 *
 * A qualite egale, l'ordre de preference est deterministe (vignette, puis
 * video, puis anciennete) pour que l'affichage ne varie pas d'une requete a
 * l'autre.
 *
 * `alias` et `libraryIdColumn` sont des identifiants internes, jamais des
 * entrees utilisateur.
 */
export function exerciseLibraryLateral(
  alias: string,
  libraryIdColumn?: string
): string {
  const matchesRow = libraryIdColumn
    ? `(
             (${alias}.${libraryIdColumn} IS NOT NULL AND el.id = ${alias}.${libraryIdColumn})
             OR (${alias}.${libraryIdColumn} IS NULL
                 AND LOWER(TRIM(el.name)) = LOWER(TRIM(${alias}.name)))
           )`
    : `LOWER(TRIM(el.name)) = LOWER(TRIM(${alias}.name))`

  // La vignette n'est retenue que si elle illustre bien la vidéo courante.
  //
  // Une miniature appartient à une vidéo précise. Corriger l'identifiant Vimeo
  // d'un exercice sans renouveler sa vignette laissait l'aperçu de l'ancien
  // mouvement sur le nouveau — et une image fausse se lit comme une
  // information, là où une image absente se voit.
  //
  // `thumbnail_video_id` enregistre la vidéo d'où vient la vignette. Vide, on
  // lui fait confiance : les vignettes posées avant cette colonne sont pour la
  // plupart justes, et toutes les effacer d'un coup serait pire. Différente de
  // la vidéo courante, elle est écartée — quel que soit le chemin par lequel
  // l'identifiant a changé.
  return `LEFT JOIN LATERAL (
       SELECT el.vimeo_video_id,
              CASE WHEN el.thumbnail_video_id IS NOT NULL
                    AND el.thumbnail_video_id IS DISTINCT FROM el.vimeo_video_id
                   THEN NULL ELSE el.thumbnail_url END AS thumbnail_url,
              el.description
       FROM exercise_library el
       WHERE el.is_active = true
         AND ${matchesRow}
       ORDER BY (el.thumbnail_url IS NOT NULL AND el.thumbnail_url <> '') DESC,
                (el.vimeo_video_id IS NOT NULL) DESC,
                el.created_at ASC
       LIMIT 1
     ) el ON TRUE`
}

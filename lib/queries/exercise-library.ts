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

  return `LEFT JOIN LATERAL (
       SELECT el.vimeo_video_id, el.thumbnail_url
       FROM exercise_library el
       WHERE el.is_active = true
         AND ${matchesRow}
       ORDER BY (el.thumbnail_url IS NOT NULL AND el.thumbnail_url <> '') DESC,
                (el.vimeo_video_id IS NOT NULL) DESC,
                el.created_at ASC
       LIMIT 1
     ) el ON TRUE`
}

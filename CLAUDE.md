# D5 Clients — application cliente

## Toute sauvegarde se confirme

Règle posée par Daye, sans exception : **dès qu'une donnée est enregistrée,
l'écran doit le dire.**

Une sauvegarde silencieuse laisse une question sans réponse — est-ce passé ?
On re-clique, on recharge la page pour vérifier, et au bout de quelques fois on
cesse de faire confiance à l'écran. Chez un client en salle, c'est pire : il
croit sa séance enregistrée et la retrouve vide le lendemain.

Trois points qui ont déjà été ratés :

- **Un enregistrement en arrière-plan n'est pas dispensé.** `.catch(console.error)`
  ne dit rien à personne. C'est exactement ce qui arrivait aux charges saisies
  pendant la séance.
- **Un échec ne se confirme pas, et ne s'efface pas.** Le succès disparaît au
  bout de quelques secondes ; l'erreur reste, parce qu'il y a quelque chose à
  faire.
- **Le geste visible suffit parfois** — une étape qui passe au vert, un écran
  qui change. Dans ces cas, c'est l'échec qu'il faut dire, pas le succès.

Le CRM a les composants partagés correspondants dans
`src/components/ui/Confirmation.tsx` ; ici, chaque écran gère son état, faute
d'équivalent commun.

## Le reste du projet

- Les actions serveur Next plafonnent le corps des requêtes à **1 Mo** : toute
  photo ou vidéo passe par un téléversement direct vers le blob
  (`lib/televerser.ts` + `app/api/televersement/route.ts`), jamais par une
  action.
- Photos et vidéos de progression, photos de repas : **blob privé**, servi par
  des routes qui vérifient la session. Aucun usage public sans l'accord
  explicite du client, demandé au moment de la publication.
- Les exercices n'ont qu'un **nom** venant du CRM ; vidéo et description sont
  lues dans `exercise_library`. La comparaison des noms passe toujours par la
  même normalisation : Unicode NFC, apostrophes typographiques ramenées à `'`,
  espaces réduits.
- Base Neon partagée avec le CRM, **sans outil de migration commun** :
  `db/migrations/*.sql` documente, mais n'exécute rien.
- Déploiement depuis `main`.

import { NextRequest } from "next/server";
import { jsonUtf8 } from "@/lib/json-utf8";
import { pool } from "@/lib/db";

/**
 * État d'un compte, pour comprendre un refus de connexion.
 *
 * L'écran de connexion dit « Email ou mot de passe incorrect » quoi qu'il
 * arrive, et c'est voulu : préciser laquelle des deux valeurs est fausse
 * dirait à un inconnu quelles adresses existent. Mais le coach, lui, n'a alors
 * aucun moyen de savoir si le compte existe, s'il est archivé, s'il est
 * bloqué, ou si l'adresse comporte une faute de frappe — quatre causes qui
 * donnent le même message et appellent quatre gestes différents.
 *
 * Cette route répond à cette question, et à elle seule. Elle ne vérifie aucun
 * mot de passe : une adresse qui accepterait un mot de passe à tester en
 * boucle serait une porte ouverte, secret ou pas.
 *
 * Elle liste aussi les adresses proches quand l'exacte est introuvable, parce
 * que la faute de frappe est le cas le plus fréquent et le plus difficile à
 * voir à l'œil nu.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return jsonUtf8({ error: "Unauthorized" }, { status: 401 });
  }

  const email = (req.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    return jsonUtf8({ error: "Paramètre email manquant" }, { status: 400 });
  }

  try {
    const { rows } = await pool.query<{
      email: string;
      first_name: string;
      last_name: string;
      is_active: boolean;
      is_blocked: boolean;
      is_reboot_only: boolean;
      a_un_mot_de_passe: boolean;
      created_at: Date;
    }>(
      `SELECT email, first_name, last_name, is_active, is_blocked, is_reboot_only,
              (password_hash IS NOT NULL AND password_hash <> '') AS a_un_mot_de_passe,
              created_at
       FROM clients WHERE email = $1`,
      [email]
    );

    const compte = rows[0];
    if (!compte) {
      // La connexion compare l'adresse exacte. Une faute d'un caractère donne
      // donc le même refus qu'un mot de passe faux, sans aucun indice.
      // La comparaison ignore tout ce qui n'est ni lettre ni chiffre : un point
      // ou un tiret en trop est l'erreur la plus fréquente, et c'est aussi la
      // plus invisible à l'œil. « d5coachingdistance@ » et
      // « d5coaching-distance@ » se ressemblent assez pour qu'on recopie l'un
      // en croyant écrire l'autre.
      const { rows: proches } = await pool.query<{ email: string }>(
        `SELECT email FROM clients
         WHERE REGEXP_REPLACE(LOWER(email), '[^a-z0-9]', '', 'g')
               = REGEXP_REPLACE($1, '[^a-z0-9]', '', 'g')
            OR REGEXP_REPLACE(LOWER(SPLIT_PART(email, '@', 1)), '[^a-z0-9]', '', 'g')
               = REGEXP_REPLACE($2, '[^a-z0-9]', '', 'g')
         ORDER BY email LIMIT 10`,
        [email, email.split("@")[0]]
      );
      return jsonUtf8({
        email,
        existe: false,
        diagnostic:
          proches.length > 0
            ? "Aucun compte à cette adresse exacte, mais une adresse très proche existe. C'est presque sûrement elle."
            : "Aucun compte à cette adresse exacte. La connexion compare l'adresse au caractère près.",
        adressesProches: proches.map((p) => p.email),
      });
    }

    const empeche =
      !compte.is_active
        ? "Compte archivé : la connexion est refusée avec le même message qu'un mot de passe faux."
        : compte.is_blocked
          ? "Compte bloqué : même refus, même message."
          : !compte.a_un_mot_de_passe
            ? "Aucun mot de passe enregistré sur ce compte."
            : null;

    return jsonUtf8({
      email: compte.email,
      existe: true,
      nom: `${compte.first_name} ${compte.last_name}`,
      actif: compte.is_active,
      bloqué: compte.is_blocked,
      participantReboot: compte.is_reboot_only,
      motDePasseEnregistré: compte.a_un_mot_de_passe,
      crééLe: compte.created_at,
      diagnostic:
        empeche ??
        "Le compte est en ordre. Si la connexion échoue, c'est le mot de passe : réinitialise-le depuis sa fiche dans le CRM.",
    });
  } catch (err) {
    console.error("[stats/compte]", err);
    return jsonUtf8({ error: String(err) }, { status: 500 });
  }
}

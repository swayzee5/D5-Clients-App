import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { QUESTIONS, SCORE_AXES, choiceLabel, type Answers } from "@/lib/reboot-diagnostic";

/**
 * Les diagnostics de départ, en clair et tous d'un coup.
 *
 * À quoi ça sert : préparer les vocaux et le plan du groupe demande de relire
 * les treize diagnostics ensemble, pour voir ce qui revient. Le CRM les montre
 * un par un, fiche par fiche — bien pour agir sur une personne, inutilisable
 * pour dégager une tendance.
 *
 * Cette route rend le tout en une page, questions et réponses mises en regard,
 * prête à être relue ou collée ailleurs.
 *
 * Données personnelles : ce sont les mots de vraies personnes sur leur fatigue,
 * leur sommeil, leur stress, l'image qu'elles ont de leur corps. Le formulaire
 * leur annonce que leurs réponses servent à ce que leur coach leur prépare un
 * message ; il ne leur annonce rien d'autre.
 *
 * D'où le choix par défaut : aucune identité. Chaque participant devient
 * « Participant N », numéroté dans l'ordre de réponse, et le coach garde la
 * correspondance de son côté. Relire les treize diagnostics pour en tirer une
 * tendance, ou préparer un brief de vocal, ne demande pas de savoir qui est
 * qui — seulement de pouvoir les distinguer.
 *
 * Les noms restent accessibles quand ils sont réellement nécessaires :
 * `?noms=1` donne le prénom et l'initiale, `?complet=1` le nom entier. Ce sont
 * des exceptions à demander, pas le comportement normal.
 *
 * Le secret est exigé dans tous les cas, et son absence côté serveur fait
 * refuser la route au lieu de l'ouvrir à tous.
 */

type Row = {
  first_name: string;
  last_name: string;
  answers: Answers | null;
  submitted_at: Date | null;
  score_global: number | null;
  score_sommeil: number | null;
  score_energie: number | null;
  score_recuperation: number | null;
  score_stress: number | null;
  score_motivation: number | null;
  score_confiance: number | null;
};

/** Rend une réponse lisible, quel que soit le type de question. */
function readable(id: string, answers: Answers): string | number | null {
  const value = (answers as Record<string, unknown>)[id];
  if (value === undefined || value === null || value === "") return null;

  const question = QUESTIONS.find((q) => q.id === id);
  if (!question) return String(value);

  if (question.kind === "single") return choiceLabel(question.id, String(value));
  if (question.kind === "yesno") {
    const v = value as { value?: string; detail?: string };
    const oui = v.value === "oui" ? "Oui" : v.value === "non" ? "Non" : "—";
    return v.detail ? `${oui} — ${v.detail}` : oui;
  }
  if (question.kind === "percent") return `${value} %`;
  return String(value);
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const complet = req.nextUrl.searchParams.get("complet") === "1";
  const avecNoms = complet || req.nextUrl.searchParams.get("noms") === "1";

  try {
    const { rows } = await pool.query<Row>(
      `SELECT c.first_name, c.last_name,
              d.answers, d.submitted_at,
              d.score_global, d.score_sommeil, d.score_energie, d.score_recuperation,
              d.score_stress, d.score_motivation, d.score_confiance
       FROM clients c
       LEFT JOIN reboot_diagnostics d ON d.client_id::text = c.id::text
       WHERE c.is_reboot_only = true AND c.is_active = true
       ORDER BY d.submitted_at ASC NULLS LAST, c.first_name ASC`
    );

    // Numérotation stable : l'ordre de la requête est celui des réponses, donc
    // « Participant 3 » désigne la même personne d'un appel à l'autre tant
    // qu'aucun nouveau diagnostic n'arrive.
    const etiquettes = new Map<Row, string>();
    rows.forEach((r, i) => etiquettes.set(r, `Participant ${i + 1}`));

    const nom = (r: Row) => {
      if (complet) return `${r.first_name} ${r.last_name}`;
      if (avecNoms) return `${r.first_name} ${r.last_name.charAt(0)}.`;
      return etiquettes.get(r) ?? "Participant";
    };

    const remplis = rows.filter((r) => r.submitted_at !== null && r.answers !== null);
    const enAttente = rows.filter((r) => r.submitted_at === null || r.answers === null);

    return NextResponse.json({
      participants: rows.length,
      remplis: remplis.length,
      // Volontairement aucune table de correspondance ici : la sortie
      // anonymisée est faite pour être copiée ailleurs, et y joindre les
      // prénoms annulerait l'anonymisation dans le même geste. Pour retrouver
      // qui est « Participant 3 », rappeler la route avec &noms=1 — l'ordre
      // est le même.
      identités: avecNoms
        ? "prénoms affichés"
        : "anonymisé — &noms=1 pour retrouver les prénoms, même ordre",
      ordre: "par date de réponse, du plus ancien au plus récent",
      enAttente: enAttente.map(nom),
      diagnostics: remplis.map((r) => ({
        participant: nom(r),
        date: r.submitted_at,
        scoreGlobal: r.score_global,
        notesSur10: SCORE_AXES.reduce<Record<string, number>>((acc, axe) => {
          const brut = (r as unknown as Record<string, number | null>)[`score_${axe.key}`];
          acc[axe.label] = brut === null || brut === undefined ? 0 : Math.round(brut / 10);
          return acc;
        }, {}),
        reponses: QUESTIONS.filter((q) => q.id !== "notes").reduce<Record<string, unknown>>(
          (acc, q) => {
            acc[q.prompt] = readable(q.id, r.answers as Answers);
            return acc;
          },
          {}
        ),
      })),
    });
  } catch (err) {
    console.error("[stats/reboot-diagnostics]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

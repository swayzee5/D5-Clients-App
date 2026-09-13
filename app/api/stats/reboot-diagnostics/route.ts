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
 * Données personnelles : ce sont les mots de vraies personnes sur leur santé et
 * leur fatigue. D'où le secret exigé, et le nom de famille réduit à son
 * initiale — assez pour reconnaître qui, dans un groupe de treize, sans
 * promener des identités complètes dans un presse-papier. `?complet=1` donne le
 * nom entier quand il faut vraiment trancher entre deux homonymes.
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

    const nom = (r: Row) =>
      complet ? `${r.first_name} ${r.last_name}` : `${r.first_name} ${r.last_name.charAt(0)}.`;

    const remplis = rows.filter((r) => r.submitted_at !== null && r.answers !== null);
    const enAttente = rows.filter((r) => r.submitted_at === null || r.answers === null);

    return NextResponse.json({
      participants: rows.length,
      remplis: remplis.length,
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

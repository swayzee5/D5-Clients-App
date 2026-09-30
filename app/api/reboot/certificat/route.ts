import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { countSeanceCompletions } from "@/lib/queries/reboot";

/**
 * Le certificat en vrai fichier PDF.
 *
 * Le bouton déclenchait jusqu'ici l'impression du navigateur : la personne
 * devait ouvrir le panneau d'impression, comprendre qu'il fallait choisir
 * « Enregistrer au format PDF », et espérer que la mise en page passe. Sur un
 * téléphone, à 60 ans, au moment où l'on veut juste garder une preuve de ce
 * qu'on a accompli, c'est trois occasions d'abandonner.
 *
 * Le fichier est donc construit ici et renvoyé en pièce jointe. Ce qu'on perd
 * en fidélité — les polices standard du PDF n'ont ni emoji ni dégradé — se
 * regagne en certitude : le résultat est le même sur tous les appareils, et
 * ne dépend plus de ce que le navigateur veut bien imprimer.
 *
 * Le certificat n'est délivré qu'aux dix étapes validées. Le refuser à
 * quelqu'un qui n'a pas fini n'est pas une punition : c'est ce qui lui donne
 * sa valeur.
 */

const OR = rgb(1, 0.416, 0);
const BLANC = rgb(1, 1, 1);
const GRIS = rgb(0.62, 0.62, 0.62);
const GRIS_SOMBRE = rgb(0.35, 0.35, 0.35);
const FOND = rgb(0.043, 0.043, 0.043);
const VERT = rgb(0.13, 0.77, 0.37);

const ACCOMPLI = [
  "3 seances d'entrainement completees",
  "3 messages envoyes dans le groupe",
  "Module : la regularite avant l'intensite",
  "Module : l'hydratation",
  "Module : le sommeil",
  "Module : les proteines a chaque repas",
];

/**
 * Les polices standard d'un PDF n'encodent que le jeu WinAnsi : une lettre
 * hors de ce jeu fait échouer l'écriture entière. Les accents français en font
 * partie et passent donc, mais pas un emoji ni un caractère exotique qu'un nom
 * de famille peut contenir. On retire ce qui dépasse plutôt que de risquer un
 * certificat qui ne se génère pas du tout.
 */
function nettoyer(texte: string): string {
  // eslint-disable-next-line no-control-regex
  return texte.replace(/[^\x20-\x7E -ÿŒœ’–]/g, "").trim();
}

function texte(
  page: PDFPage,
  contenu: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  color = BLANC
) {
  page.drawText(nettoyer(contenu), { x, y, size, font, color });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const clientId = session.user.id;

  const { rows } = await pool.query<{ first_name: string; last_name: string; is_reboot_only: boolean }>(
    `SELECT first_name, last_name, is_reboot_only FROM clients WHERE id = $1`,
    [clientId]
  );
  const client = rows[0];
  if (!client?.is_reboot_only) {
    return NextResponse.json({ error: "Réservé aux participants du Reboot" }, { status: 403 });
  }

  const [seances, modules, messages] = await Promise.all([
    countSeanceCompletions(clientId),
    pool
      .query<{ cnt: string }>(`SELECT COUNT(*) AS cnt FROM reboot_task_completions WHERE client_id = $1`, [clientId])
      .then((r) => Number(r.rows[0]?.cnt ?? 0))
      .catch(() => 0),
    pool
      .query<{ cnt: string }>(`SELECT COUNT(*) AS cnt FROM reboot_whatsapp_completions WHERE client_id = $1`, [clientId])
      .then((r) => Number(r.rows[0]?.cnt ?? 0))
      .catch(() => 0),
  ]);

  if (seances < 3 || modules < 4 || messages < 3) {
    return NextResponse.json(
      { error: "Challenge non terminé", étapes: `${Math.min(seances, 3) + Math.min(modules, 4) + Math.min(messages, 3)}/10` },
      { status: 403 }
    );
  }

  const { rows: dateRows } = await pool
    .query<{ d: Date }>(
      `SELECT MAX(completed_at) AS d FROM reboot_task_completions WHERE client_id = $1`,
      [clientId]
    )
    .catch(() => ({ rows: [] as { d: Date }[] }));
  const dateFin = dateRows[0]?.d ?? new Date();
  const dateLisible = new Date(dateFin).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const pdf = await PDFDocument.create();
  pdf.setTitle("Certificat Reboot 40");
  pdf.setAuthor("D5 Coaching");

  // A4 portrait, en points.
  const page = pdf.addPage([595, 842]);
  const gras = await pdf.embedFont(StandardFonts.HelveticaBold);
  const normal = await pdf.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: FOND });
  // Cadre doré, à 28 points des bords.
  page.drawRectangle({
    x: 28, y: 28, width: 539, height: 786,
    borderColor: OR, borderWidth: 1.2, color: FOND,
  });

  texte(page, "D5 COACHING", 60, 760, 20, gras, OR);
  texte(page, "d5coaching-distance.com", 60, 744, 8, normal, GRIS_SOMBRE);

  page.drawLine({
    start: { x: 60, y: 726 }, end: { x: 535, y: 726 },
    thickness: 1, color: OR, opacity: 0.55,
  });

  texte(page, "CERTIFICAT DE REUSSITE", 60, 682, 10, gras, OR);
  texte(page, "REBOOT 40", 60, 636, 40, gras, BLANC);
  texte(page, "CHALLENGE 7 JOURS", 60, 616, 10, normal, GRIS_SOMBRE);

  page.drawRectangle({
    x: 60, y: 520, width: 475, height: 74,
    borderColor: OR, borderWidth: 0.8, opacity: 0.12, color: OR,
  });
  texte(page, "DECERNE AVEC FIERTE A", 78, 566, 8, normal, GRIS);
  texte(page, `${client.first_name} ${client.last_name}`, 78, 538, 24, gras, BLANC);

  texte(page, "Pour avoir complete le challenge Reboot 40 dans son integralite", 60, 486, 11, normal, GRIS);
  texte(page, "et prouve sa capacite a etre regulier.", 60, 470, 11, normal, GRIS);

  let y = 432;
  for (const ligne of ACCOMPLI) {
    texte(page, "v", 62, y, 11, gras, VERT);
    texte(page, ligne, 80, y, 11, normal, GRIS);
    y -= 22;
  }

  page.drawLine({ start: { x: 60, y: 250 }, end: { x: 535, y: 250 }, thickness: 0.6, color: GRIS_SOMBRE });

  texte(page, "Daye Kaba", 60, 220, 13, gras, BLANC);
  texte(page, "Coach - D5 Coaching Distance", 60, 204, 9, normal, GRIS_SOMBRE);

  texte(page, "COMPLETE LE", 420, 220, 8, normal, GRIS_SOMBRE);
  texte(page, dateLisible, 420, 202, 12, gras, OR);

  const octets = await pdf.save();

  const nomFichier = nettoyer(`Certificat-Reboot-40-${client.first_name}-${client.last_name}`)
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9-]/g, "");

  return new NextResponse(Buffer.from(octets), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomFichier}.pdf"`,
      // Le certificat porte un nom et une date : il ne doit jamais être servi
      // depuis un cache partagé à quelqu'un d'autre.
      "Cache-Control": "private, no-store",
    },
  });
}

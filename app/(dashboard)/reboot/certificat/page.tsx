export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { countSeanceCompletions } from "@/lib/queries/reboot";
import CertificatClient from "./CertificatClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mon Certificat — Reboot 40" };

export default async function CertificatPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const clientId = session.user.id;

  // La table s'appelle « clients ». Interroger « app_clients » levait une
  // erreur, avalée par le .catch, qui renvoyait une liste vide : le certificat
  // concluait que la personne n'était pas participante et la renvoyait au
  // tableau de bord. Le bouton « Télécharger mon certificat » ne menait donc
  // nulle part, sans le moindre message.
  //
  // Le catch est retiré : si la base est indisponible, il vaut mieux une page
  // en erreur qu'une redirection silencieuse vers un écran qui n'explique rien.
  const { rows: clientRows } = await pool.query(
    `SELECT first_name, last_name, is_reboot_only FROM clients WHERE id = $1`,
    [clientId]
  );

  const client = clientRows[0];
  if (!client?.is_reboot_only) redirect("/dashboard");

  const firstName: string = client.first_name ?? "";
  const lastName: string = client.last_name ?? "";

  // Completion state
  let sessionsCompleted = 0;
  let modulesCompleted = 0;
  let waCompleted = 0;
  let completionDate = "";

  try {
    sessionsCompleted = await countSeanceCompletions(clientId);
  } catch {}

  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) as cnt FROM reboot_task_completions WHERE client_id = $1`,
      [clientId]
    );
    modulesCompleted = parseInt(rows[0]?.cnt ?? 0);
  } catch {}

  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) as cnt FROM reboot_whatsapp_completions WHERE client_id = $1`,
      [clientId]
    );
    waCompleted = parseInt(rows[0]?.cnt ?? 0);
  } catch {}

  const totalCompleted =
    Math.min(sessionsCompleted, 3) +
    Math.min(waCompleted, 3) +
    Math.min(modulesCompleted, 4);
  const allDone = totalCompleted >= 10;

  if (allDone) {
    try {
      const { rows } = await pool.query(
        `SELECT MAX(d) as last_date FROM (
          SELECT MAX(completed_at) as d FROM reboot_completions WHERE client_id = $1::uuid
          UNION ALL
          SELECT MAX(completed_at) as d FROM reboot_task_completions WHERE client_id = $1
        ) dates`,
        [clientId]
      );
      if (rows[0]?.last_date) {
        completionDate = new Intl.DateTimeFormat("fr-FR", {
          day: "numeric", month: "long", year: "numeric",
        }).format(new Date(rows[0].last_date));
      }
    } catch {}
  }

  return (
    <CertificatClient
      firstName={firstName}
      lastName={lastName}
      completionDate={completionDate}
      totalCompleted={totalCompleted}
      allDone={allDone}
    />
  );
}

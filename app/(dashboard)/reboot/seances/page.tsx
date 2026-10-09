export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getRebootSessions } from "@/lib/queries/reboot";
import { SeancesSection } from "../SeancesSection";
import type { RebootTab } from "@/lib/reboot-catalogue";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mes séances — Reboot 40" };

const SEANCES_GOAL = 3;

/**
 * Les séances, seules sur leur page.
 *
 * La carte « prochaine étape » menait à un repère dans la page du challenge :
 * on cliquait, et on retombait sur la même page, avec les messages WhatsApp et
 * les modules en dessous. Rien n'indiquait qu'il s'était passé quelque chose.
 *
 * Une action nommée doit mener à un écran qui ne contient qu'elle. C'est toute
 * la différence entre « voici ta prochaine étape » et « débrouille-toi ».
 */
export default async function SeancesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  let sessions: Awaited<ReturnType<typeof getRebootSessions>> = [];
  try {
    sessions = await getRebootSessions(session.user.id);
  } catch {
    // Séances indisponibles : la page s'affiche vide plutôt que de planter.
  }

  const sessionsByTab = { salle: [], maison: [], mobilite: [], hiit: [] } as Record<
    RebootTab,
    typeof sessions
  >;
  for (const s of sessions) {
    const tab = (s.tab ?? "salle") as RebootTab;
    (sessionsByTab[tab] ?? sessionsByTab.salle).push(s);
  }

  const sessionsCompleted = sessions.filter((s) => s.completed && !s.is_bonus).length;

  return (
    <div className="space-y-5 pb-8">
      <Link
        href="/reboot"
        className="inline-flex items-center gap-1.5 text-sm text-d5-muted transition-colors hover:text-white"
      >
        <ArrowLeft size={14} />
        Retour au challenge
      </Link>

      <div>
        <h1 className="text-xl font-bold text-white">Mes séances</h1>
        <p className="mt-1 text-sm leading-relaxed text-d5-muted">
          Choisis où tu t&apos;entraînes, puis la séance qui te va. Chaque exercice a sa
          vidéo de démonstration.
        </p>
      </div>

      <SeancesSection
        sessionsByTab={sessionsByTab}
        sessionsCompleted={sessionsCompleted}
        seancesGoal={SEANCES_GOAL}
      />
    </div>
  );
}

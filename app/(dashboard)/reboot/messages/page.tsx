export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { pool } from "@/lib/db";
import { countSeanceCompletions } from "@/lib/queries/reboot";
import { WhatsappSection } from "../WhatsappSection";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mes messages — Reboot 40" };

const WA_GOAL = 3;

/** Les trois messages du groupe, seuls sur leur page. */
export default async function MessagesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const clientId = session.user.id;

  const sessionsCompleted = await countSeanceCompletions(clientId).catch(() => 0);

  let waCompleted = 0;
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM reboot_whatsapp_completions WHERE client_id = $1`,
      [clientId]
    );
    waCompleted = parseInt(rows[0]?.cnt ?? 0);
  } catch {
    // Table absente tant qu'aucun message n'a été déclaré.
  }

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
        <h1 className="text-xl font-bold text-white">Mes messages</h1>
        <p className="mt-1 text-sm leading-relaxed text-d5-muted">
          Un message dans le groupe après chaque séance. C&apos;est ce qui fait avancer
          les autres, et ce qui te fait avancer quand ce sont eux qui postent.
        </p>
      </div>

      <WhatsappSection
        clientId={clientId}
        waCompleted={waCompleted}
        sessionsCompleted={sessionsCompleted}
        goal={WA_GOAL}
      />
    </div>
  );
}

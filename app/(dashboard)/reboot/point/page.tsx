export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { pool } from "@/lib/db";
import { countSeanceCompletions } from "@/lib/queries/reboot";
import { MiniPointForm } from "@/components/reboot/MiniPointForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mon point — Reboot 40" };

/**
 * Le mini-point de mi-parcours, au mercredi.
 *
 * Sa raison d'être n'est pas de mesurer : c'est de faire remonter ce qui
 * coince, pendant qu'il est encore temps d'agir. Un participant qui décroche le
 * mercredi est récupérable ; le même, découvert au bilan du dimanche, ne l'est
 * plus.
 *
 * Trois questions, pas une de plus. Ce qui est déjà enregistré n'est pas
 * redemandé : quelqu'un qui a validé deux séances dans l'app ne doit pas avoir
 * à confirmer qu'il s'est entraîné.
 */
export default async function MiniPointPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const clientId = session.user.id;

  const seancesValidees = await countSeanceCompletions(clientId).catch(() => 0);

  let dejaRempli = false;
  try {
    const { rowCount } = await pool.query(
      `SELECT 1 FROM reboot_mid_checkins WHERE client_id = $1`,
      [clientId]
    );
    dejaRempli = (rowCount ?? 0) > 0;
  } catch {
    // Table absente tant que personne n'a répondu : le formulaire s'affiche.
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

      {dejaRempli ? (
        <div className="card space-y-2 py-8 text-center">
          <p className="text-3xl">✅</p>
          <p className="font-bold text-white">Ton point est enregistré</p>
          <p className="text-sm text-d5-muted">
            Ton coach l&apos;a reçu. S&apos;il y a quelque chose à débloquer, il revient vers toi.
          </p>
        </div>
      ) : (
        <MiniPointForm
          firstName={session.user?.name?.split(" ")[0]}
          seancesValidees={seancesValidees}
        />
      )}
    </div>
  );
}

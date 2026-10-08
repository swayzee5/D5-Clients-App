export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getRebootDiagnostic } from "@/lib/queries/reboot-diagnostic";
import { getBilan } from "@/lib/queries/reboot-bilan";
import { comparer } from "@/lib/reboot-diagnostic";
import { BilanForm } from "@/components/reboot/BilanForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mon bilan — Reboot 40" };

/**
 * Le bilan de fin, et sa relecture.
 *
 * Deux états : le formulaire tant qu'il n'est pas rempli, la comparaison
 * figée ensuite. Un bilan ne se refait pas — les notes de fin sont une mesure
 * datée, les rejouer une semaine plus tard effacerait ce qu'on cherche
 * justement à conserver.
 *
 * La page exige le diagnostic de départ : sans point de comparaison, les six
 * notes de fin ne valent rien, et mieux vaut renvoyer au challenge que
 * produire un bilan vide.
 */
export default async function BilanPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const clientId = session.user.id;

  const depart = await getRebootDiagnostic(clientId);
  if (!depart) redirect("/reboot");

  const bilan = await getBilan(clientId);
  const prenom = session.user?.name?.split(" ")[0];

  return (
    <div className="space-y-5 pb-8">
      <Link
        href="/reboot"
        className="inline-flex items-center gap-1.5 text-sm text-d5-muted transition-colors hover:text-white"
      >
        <ArrowLeft size={14} />
        Retour au challenge
      </Link>

      {bilan ? (
        <BilanFige
          departGlobal={depart.scores.global}
          arriveeGlobal={bilan.scores.global}
          evolutions={comparer(depart.scores, bilan.scores)}
          temoignage={bilan.temoignage}
        />
      ) : (
        <BilanForm depart={depart.scores} firstName={prenom} />
      )}
    </div>
  );
}

function BilanFige({
  departGlobal,
  arriveeGlobal,
  evolutions,
  temoignage,
}: {
  departGlobal: number;
  arriveeGlobal: number;
  evolutions: ReturnType<typeof comparer>;
  temoignage: string | null;
}) {
  const ecart = arriveeGlobal - departGlobal;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-d5-gold/30 bg-gradient-to-br from-d5-gold/15 to-transparent p-5 text-center">
        <p className="text-xs uppercase tracking-wider text-d5-muted">Ton Reboot Score</p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <div>
            <p className="text-3xl font-black text-d5-muted">{departGlobal}</p>
            <p className="text-[11px] text-d5-muted">au départ</p>
          </div>
          <span className="text-2xl text-d5-muted">→</span>
          <div>
            <p className="text-4xl font-black text-d5-gold">{arriveeGlobal}</p>
            <p className="text-[11px] text-d5-muted">à la fin</p>
          </div>
        </div>
        <p className={`mt-3 text-sm font-bold ${ecart > 0 ? "text-green-400" : "text-d5-muted"}`}>
          {ecart > 0 ? `+${ecart} points en 7 jours` : ecart === 0 ? "Score stable" : `${ecart} points`}
        </p>
      </div>

      <div className="card space-y-2.5">
        <p className="text-xs font-bold uppercase tracking-wider text-d5-gold">Axe par axe</p>
        {evolutions.map((e) => (
          <div key={e.axe} className="flex items-center gap-3">
            <span className="text-base">{e.emoji}</span>
            <span className="flex-1 text-sm text-gray-300">{e.axe}</span>
            <span className="text-xs text-d5-muted">
              {e.depart} → {e.arrivee}
            </span>
            <span
              className={`w-10 text-right text-sm font-bold ${
                e.ecart > 0 ? "text-green-400" : e.ecart < 0 ? "text-orange-400" : "text-d5-muted"
              }`}
            >
              {e.ecart > 0 ? `+${e.ecart}` : e.ecart}
            </span>
          </div>
        ))}
      </div>

      {temoignage && (
        <div className="card space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wider text-d5-gold">Ce que tu as écrit</p>
          <p className="text-sm leading-relaxed text-gray-300">« {temoignage} »</p>
        </div>
      )}
    </div>
  );
}

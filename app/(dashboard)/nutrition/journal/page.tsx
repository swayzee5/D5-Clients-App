export const dynamic = "force-dynamic";

// Le dépôt de la photo et sa lecture tiennent largement sous une minute, mais
// pas sous les dix secondes par défaut d'une fonction serverless.
export const maxDuration = 60;

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listerRepas } from "@/lib/queries/journal-repas";
import { EnvoyerRepas } from "@/components/nutrition/EnvoyerRepas";
import { CarteRepas } from "@/components/nutrition/CarteRepas";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mon journal — Nutrition" };

/**
 * Le journal photo des repas.
 *
 * Il remplace le plan alimentaire en PDF par quelque chose qui circule dans
 * les deux sens. Le PDF partait du coach et n'en revenait jamais : une fois
 * téléchargé, personne ne savait s'il était lu, ni ce que le client mangeait
 * réellement.
 *
 * L'envoi est en haut, avant l'historique. C'est l'action, le reste est de la
 * consultation.
 */
export default async function JournalRepasPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const repas = await listerRepas(session.user.id).catch(() => []);
  const enAttente = repas.filter((r) => r.statut !== "repondu").length;

  return (
    <div className="space-y-5 pb-8">
      <Link
        href="/nutrition"
        className="inline-flex items-center gap-1.5 text-sm text-d5-muted transition-colors hover:text-white"
      >
        <ArrowLeft size={14} />
        Nutrition
      </Link>

      <div>
        <h1 className="text-xl font-bold text-white">Mon journal</h1>
        <p className="mt-1 text-sm leading-relaxed text-d5-muted">
          Photographie tes repas, rien d&apos;autre à remplir. Je les regarde et je te
          réponds.
        </p>
      </div>

      <EnvoyerRepas />

      {repas.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between pt-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-d5-muted">
              Mes repas
            </h2>
            {enAttente > 0 && (
              <span className="text-xs text-d5-muted">
                {enAttente} en attente de réponse
              </span>
            )}
          </div>
          {repas.map((r) => (
            <CarteRepas key={r.id} repas={r} />
          ))}
        </section>
      )}

      {repas.length === 0 && (
        <div className="card space-y-2 py-10 text-center">
          <p className="text-3xl">🍽️</p>
          <p className="font-semibold text-white">Ton journal est vide</p>
          <p className="mx-auto max-w-xs text-sm leading-relaxed text-d5-muted">
            Commence par ton prochain repas. Une photo suffit — c&apos;est à partir de
            là qu&apos;on ajustera.
          </p>
        </div>
      )}
    </div>
  );
}

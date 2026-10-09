export const dynamic = "force-dynamic";

import { pool } from "@/lib/db";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reboot 40 — 7 jours pour relancer la machine",
  description:
    "Un challenge de 7 jours pour les hommes de 40 ans et plus : 3 séances, 4 modules, et un score de forme mesuré au début et à la fin.",
};

/**
 * Page publique d'invitation, celle que les participants envoient à leurs
 * proches.
 *
 * Elle existe parce que le message de partage disait « écris-lui » sans dire
 * où. Un participant enthousiaste qui n'a pas de lien à envoyer ne partage
 * rien : il ne va pas expliquer lui-même comment s'inscrire.
 *
 * Hors du dossier (dashboard), donc sans authentification ni barre de
 * navigation : la personne qui arrive ici n'a pas de compte, c'est tout
 * l'objet.
 *
 * Un seul geste attendu, et il est au premier écran. La leçon vient de la page
 * de confirmation des publicités : treize prospects, zéro message, et un
 * bouton qu'il fallait faire défiler pour voir.
 *
 * `?de=Prénom` est ajouté par le message de partage. Le prénom apparaît dans
 * le texte prérempli, ce qui donne au coach l'origine de chaque demande sans
 * aucun suivi technique.
 */
export default async function RejoindrePage({
  searchParams,
}: {
  searchParams: { de?: string };
}) {
  let numero = "";
  try {
    const { rows } = await pool.query<{ value: string }>(
      `SELECT value FROM app_settings WHERE key = 'coach_whatsapp'`
    );
    numero = (rows[0]?.value ?? "").replace(/\D/g, "");
  } catch {
    // Réglage absent : la page reste lisible, sans bouton. Mieux vaut une page
    // sans bouton qu'un bouton vers un numéro vide.
  }

  // Le prénom vient de l'URL, donc d'un inconnu : on ne garde que des lettres
  // et on borne la longueur avant de l'insérer dans un texte.
  // Jeu de caractères explicite plutôt que \p{L} : la cible TypeScript du
  // projet est ES5, qui ne connaît pas les classes Unicode.
  const parrain = (searchParams.de ?? "")
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\u0100-\u024F'\s-]/g, "")
    .trim()
    .slice(0, 30);

  const message = parrain
    ? `Bonjour Daye, je viens de la part de ${parrain}. Je veux faire le Reboot 40.`
    : "Bonjour Daye, je veux faire le Reboot 40.";

  const lien = numero ? `https://wa.me/${numero}?text=${encodeURIComponent(message)}` : null;

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-lg flex-col justify-center px-5 py-10">
      <p className="mb-7 text-center text-xs font-black tracking-[0.18em] text-d5-gold">
        D5 <span className="font-medium text-d5-muted">| COACHING</span>
      </p>

      <h1 className="text-center text-3xl font-bold leading-tight text-white">
        Reboot 40
      </h1>
      <p className="mt-2 text-center text-base leading-relaxed text-gray-300">
        7 jours pour relancer la machine.
        <br />
        Pour les hommes qui ont passé la quarantaine.
        <br />
        Sans salle obligatoire, sans y passer vos soirées.
      </p>

      {parrain && (
        <p className="mt-4 rounded-xl bg-d5-surface-2 px-4 py-3 text-center text-sm text-d5-muted">
          {parrain} vient de le terminer et pense que c&apos;est pour vous.
        </p>
      )}

      {lien ? (
        <a
          href={lien}
          target="_blank"
          rel="noopener"
          className="mt-7 block rounded-2xl bg-[#25D366] py-5 text-center text-lg font-extrabold text-[#06311a]"
        >
          Demander ma place
        </a>
      ) : (
        <p className="mt-7 rounded-2xl border border-d5-border bg-d5-surface-2 px-4 py-5 text-center text-sm text-d5-muted">
          Les inscriptions se font directement auprès du coach.
        </p>
      )}

      <p className="mt-3 text-center text-xs leading-relaxed text-d5-muted">
        Le message est déjà écrit.
        <br />
        Vous n&apos;avez qu&apos;à appuyer sur envoyer.
      </p>

      <div className="mt-10 space-y-3 border-t border-d5-border pt-7">
        <p className="text-xs font-bold uppercase tracking-wider text-d5-gold">
          Ce que contient la semaine
        </p>
        {[
          ["🏋️", "3 séances au choix", "En salle ou à la maison, avec la vidéo de chaque exercice."],
          ["📊", "Un score de forme", "Mesuré le premier jour, remesuré le dernier. L'écart est chiffré."],
          ["📚", "4 modules courts", "Sommeil, hydratation, régularité, protéines. Deux minutes chacun."],
          ["💬", "Un groupe", "D'autres hommes de votre âge avancent en même temps que vous."],
        ].map(([emoji, titre, detail]) => (
          <div key={titre} className="flex gap-3">
            <span className="text-lg">{emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-white">{titre}</span>
              <span className="block text-xs leading-relaxed text-d5-muted">{detail}</span>
            </span>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-d5-muted">
        Conçu pour les hommes de 40 ans et plus qui ont déjà essayé plusieurs
        fois.
      </p>
    </main>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import { enregistrerNaissance } from "@/app/(dashboard)/profil/actions";

/**
 * La date de naissance, saisie une fois.
 *
 * L'âge était porté par chaque mesure : à ressaisir à chaque fois, et faux
 * dès l'anniversaire passé. Une date de naissance se donne une fois et reste
 * juste.
 *
 * Elle est modifiable ensuite, mais discrètement : c'est une information
 * qu'on corrige, pas une qu'on ajuste.
 */
export function DateNaissance({ valeur }: { valeur: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  const [date, setDate] = useState(valeur ? valeur.slice(0, 10) : "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);

  function enregistrer() {
    setErreur(null);
    startTransition(async () => {
      const r = await enregistrerNaissance(date);
      if (!r.ok) {
        setErreur(r.erreur ?? "Erreur");
        return;
      }
      setFait(true);
      setOuvert(false);
      router.refresh();
    });
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="flex w-full items-center gap-3 text-left"
      >
        <Calendar size={16} className="text-d5-muted" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-d5-muted">Date de naissance</p>
          <p className="text-sm font-medium text-white">
            {valeur
              ? new Date(valeur).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "À renseigner"}
          </p>
        </div>
        <span className="shrink-0 text-xs text-d5-gold">
          {fait ? "✓ Enregistré" : valeur ? "Modifier" : "Ajouter"}
        </span>
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Calendar size={16} className="text-d5-muted" />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-d5-muted">Date de naissance</p>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-d5-border bg-d5-surface-2 px-3 py-2 text-sm text-white focus:border-d5-gold/40 focus:outline-none"
          />
        </div>
      </div>

      {/* Dit pourquoi on la demande : une date de naissance sans raison
          affichée, on la saute. */}
      <p className="text-xs text-d5-muted">
        Elle sert à adapter ton entraînement. Ton âge se mettra à jour tout seul.
      </p>

      {erreur && <p className="text-sm text-red-400">{erreur}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={enregistrer}
          disabled={isPending || !date}
          className="rounded-xl bg-d5-gold px-4 py-2 text-sm font-bold text-black transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={() => {
            setDate(valeur ? valeur.slice(0, 10) : "");
            setErreur(null);
            setOuvert(false);
          }}
          className="text-xs text-d5-muted transition-colors hover:text-white"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";
import { envoyerRepas } from "@/app/(dashboard)/nutrition/journal/actions";

/**
 * Photographier un repas.
 *
 * Un seul geste attendu : appuyer, cadrer, envoyer. Le commentaire est
 * facultatif et le restera — c'est la saisie qui fait abandonner les journaux
 * alimentaires au bout de trois semaines, pas la photo.
 *
 * `capture="environment"` ouvre directement la caméra arrière sur téléphone,
 * au lieu de la galerie. Le choix d'une photo existante reste possible depuis
 * l'écran de l'appareil photo, donc on ne perd rien.
 *
 * L'aperçu est affiché avant l'envoi, et pas seulement par politesse : une
 * photo ratée se voit tout de suite, alors qu'une photo floue découverte par
 * le coach deux heures plus tard ne se rattrape pas.
 */
export function EnvoyerRepas() {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  function choisir(f: File | null) {
    setErreur(null);
    if (apercu) URL.revokeObjectURL(apercu);
    setFichier(f);
    setApercu(f ? URL.createObjectURL(f) : null);
  }

  function annuler() {
    choisir(null);
    setNote("");
    if (champ.current) champ.current.value = "";
  }

  function envoyer() {
    if (!fichier) return;
    setErreur(null);
    startTransition(async () => {
      const data = new FormData();
      data.set("photo", fichier);
      if (note.trim()) data.set("note", note.trim());
      const r = await envoyerRepas(data);
      if (!r.ok) {
        setErreur(r.erreur);
        return;
      }
      annuler();
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <input
        ref={champ}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => choisir(e.target.files?.[0] ?? null)}
      />

      {!apercu ? (
        <button
          onClick={() => champ.current?.click()}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-d5-gold py-5 text-base font-bold text-black transition-transform active:scale-[0.98]"
        >
          <Camera size={20} />
          Photographier mon repas
        </button>
      ) : (
        <div className="card space-y-3">
          <div className="relative overflow-hidden rounded-xl bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={apercu} alt="Aperçu du repas" className="max-h-72 w-full object-contain" />
            <button
              onClick={annuler}
              disabled={isPending}
              aria-label="Retirer la photo"
              className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white disabled:opacity-40"
            >
              <X size={16} />
            </button>
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Un mot si tu veux (facultatif) — ex : au restaurant, j'avais très faim…"
            className="w-full resize-none rounded-xl border border-d5-border bg-d5-surface-2 px-3 py-2.5 text-sm text-white placeholder-d5-muted focus:border-d5-gold/40 focus:outline-none"
          />

          {erreur && <p className="text-sm text-red-400">{erreur}</p>}

          <button
            onClick={envoyer}
            disabled={isPending}
            className="w-full rounded-xl bg-d5-gold py-4 text-sm font-bold text-black transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {isPending ? "Envoi et lecture de l'assiette…" : "Envoyer à mon coach"}
          </button>

          {/* L'analyse prend quelques secondes. Le dire évite qu'on appuie
              trois fois en croyant que rien ne se passe. */}
          {isPending && (
            <p className="text-center text-xs text-d5-muted">
              Quelques secondes, ne ferme pas l&apos;écran.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

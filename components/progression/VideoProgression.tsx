"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Video, X } from "lucide-react";
import { enregistrerMediaProgression } from "@/app/(dashboard)/progression/photos/actions";
import { televerser } from "@/lib/televerser";
import type { PhotoProgression } from "@/lib/queries/progression-photos";

/**
 * La vidéo de rotation, facultative.
 *
 * Elle ne remplace pas les photos et ne sert pas au même usage. Les photos
 * servent au client : avril et octobre côte à côte, c'est ce qui le fait
 * tenir. Deux vidéos ne se comparent pas — on ne peut pas les figer au même
 * instant sous le même angle.
 *
 * La vidéo sert au coach, comme preuve. Une rotation continue de quinze
 * secondes est nettement plus difficile à fabriquer qu'une image fixe, et ça
 * se voit. À l'heure où n'importe quelle photo peut être retouchée par une
 * machine, c'est ce qui rend un témoignage croyable.
 *
 * Quinze secondes sont demandées explicitement : une vidéo de deux minutes
 * pèse dix fois plus pour la même information, et personne ne la regarde en
 * entier.
 */
export function VideoProgression({
  derniere,
}: {
  derniere: PhotoProgression | null;
}) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [progression, setProgression] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  function choisir(f: File | null) {
    setErreur(null);
    if (apercu) URL.revokeObjectURL(apercu);
    setFichier(f);
    setApercu(f ? URL.createObjectURL(f) : null);
  }

  function annuler() {
    choisir(null);
    setProgression(null);
    if (champ.current) champ.current.value = "";
  }

  function envoyer() {
    if (!fichier) return;
    setErreur(null);
    startTransition(async () => {
      const depot = await televerser("progression-video", fichier, setProgression);
      if ("erreur" in depot) {
        setErreur(depot.erreur);
        setProgression(null);
        return;
      }
      const r = await enregistrerMediaProgression({ angle: "video", chemin: depot.chemin });
      setProgression(null);
      if (!r.ok) {
        setErreur(r.erreur);
        return;
      }
      annuler();
      router.refresh();
    });
  }

  return (
    <div className="card space-y-3">
      <div>
        <p className="text-sm font-semibold text-white">Vidéo de rotation (facultatif)</p>
        <p className="mt-0.5 text-xs leading-relaxed text-d5-muted">
          Quinze secondes, un tour complet sur toi-même, lentement. Elle ne remplace pas les
          photos : c&apos;est ce qui rendra ta transformation indiscutable quand tu voudras la
          montrer.
        </p>
      </div>

      <input
        ref={champ}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => choisir(e.target.files?.[0] ?? null)}
      />

      {!apercu ? (
        <>
          {derniere && (
            <video
              src={`/api/progression/photo/${derniere.id}`}
              controls
              playsInline
              preload="metadata"
              className="max-h-64 w-full rounded-xl bg-black"
            />
          )}
          <button
            onClick={() => champ.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-d5-border bg-d5-surface-2 py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            <Video size={17} />
            {derniere ? "Refaire la vidéo" : "Filmer ma rotation"}
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl bg-black">
            <video src={apercu} controls playsInline className="max-h-72 w-full" />
            <button
              onClick={annuler}
              disabled={isPending}
              aria-label="Retirer la vidéo"
              className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white disabled:opacity-40"
            >
              <X size={16} />
            </button>
          </div>

          {erreur && <p className="text-sm text-red-400">{erreur}</p>}

          <button
            onClick={envoyer}
            disabled={isPending}
            className="w-full rounded-xl bg-d5-gold py-3.5 text-sm font-bold text-black transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {isPending
              ? progression !== null
                ? `Envoi… ${progression} %`
                : "Envoi…"
              : "Enregistrer"}
          </button>

          {/* Une vidéo part en plusieurs morceaux et peut prendre une minute
              en 4G. Le dire évite qu'on ferme l'écran au milieu. */}
          {isPending && (
            <p className="text-center text-xs text-d5-muted">
              Une vidéo prend plus de temps qu&apos;une photo. Ne ferme pas l&apos;écran.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, X, Layers } from "lucide-react";
import { envoyerPhotoProgression } from "@/app/(dashboard)/progression/photos/actions";
import type { AnglePhoto, PhotoProgression } from "@/lib/queries/progression-photos";

/**
 * Prise et reprise des photos de progression.
 *
 * Le cadrage fait toute la valeur de l'exercice. Deux photos prises de loin
 * puis de près, sous deux lumières, ne se comparent pas — et une comparaison
 * fausse décourage plus qu'elle n'encourage.
 *
 * Je ne peux pas dessiner un repère par-dessus l'appareil photo du téléphone :
 * aucune application web n'a la main sur sa fenêtre. D'où deux aides à la
 * place, qui couvrent le même besoin : la photo précédente est affichée AVANT
 * la prise, comme modèle à reproduire, et superposable APRÈS, pour juger de
 * l'alignement et recommencer tant que ça ne colle pas.
 */

type AngleDef = { cle: AnglePhoto; label: string; consigne: string };

export function PhotosProgression({
  angles,
  derniereParAngle,
}: {
  angles: AngleDef[];
  /** La dernière photo connue de chaque angle, comme modèle de cadrage. */
  derniereParAngle: Partial<Record<AnglePhoto, PhotoProgression>>;
}) {
  return (
    <div className="space-y-3">
      {angles.map((angle) => (
        <CarteAngle key={angle.cle} angle={angle} precedente={derniereParAngle[angle.cle] ?? null} />
      ))}
    </div>
  );
}

function CarteAngle({
  angle,
  precedente,
}: {
  angle: AngleDef;
  precedente: PhotoProgression | null;
}) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [fichier, setFichier] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [superpose, setSuperpose] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function choisir(f: File | null) {
    setErreur(null);
    if (apercu) URL.revokeObjectURL(apercu);
    setFichier(f);
    setApercu(f ? URL.createObjectURL(f) : null);
    setSuperpose(false);
  }

  function annuler() {
    choisir(null);
    if (champ.current) champ.current.value = "";
  }

  function envoyer() {
    if (!fichier) return;
    setErreur(null);
    startTransition(async () => {
      const data = new FormData();
      data.set("angle", angle.cle);
      data.set("photo", fichier);
      const r = await envoyerPhotoProgression(data);
      if (!r.ok) {
        setErreur(r.erreur);
        return;
      }
      annuler();
      router.refresh();
    });
  }

  const urlPrecedente = precedente ? `/api/progression/photo/${precedente.id}` : null;

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{angle.label}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-d5-muted">{angle.consigne}</p>
        </div>
        {precedente && !apercu && (
          <span className="shrink-0 text-xs text-d5-muted">{quand(precedente.date)}</span>
        )}
      </div>

      <input
        ref={champ}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => choisir(e.target.files?.[0] ?? null)}
      />

      {!apercu ? (
        <>
          {urlPrecedente && (
            <div className="space-y-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urlPrecedente}
                alt={`Photo précédente ${angle.label}`}
                className="max-h-56 w-full rounded-xl bg-black object-contain"
              />
              <p className="text-center text-xs text-d5-muted">
                Reprends le même cadrage, la même distance et la même lumière.
              </p>
            </div>
          )}
          <button
            onClick={() => champ.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-d5-border bg-d5-surface-2 py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
          >
            <Camera size={17} />
            {precedente ? "Reprendre cette photo" : "Prendre la photo"}
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={apercu} alt="Nouvelle photo" className="max-h-72 w-full object-contain" />
            {/* La superposition sert à vérifier l'alignement, pas à décorer :
                si les deux silhouettes ne se recouvrent pas, la comparaison
                dans six mois ne vaudra rien. */}
            {superpose && urlPrecedente && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urlPrecedente}
                alt=""
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-50"
              />
            )}
            <button
              onClick={annuler}
              disabled={isPending}
              aria-label="Retirer la photo"
              className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white disabled:opacity-40"
            >
              <X size={16} />
            </button>
          </div>

          {urlPrecedente && (
            <button
              onClick={() => setSuperpose((v) => !v)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-d5-border bg-d5-surface-2 py-2.5 text-xs text-d5-muted"
            >
              <Layers size={14} />
              {superpose ? "Masquer la précédente" : "Superposer la précédente pour vérifier"}
            </button>
          )}

          {erreur && <p className="text-sm text-red-400">{erreur}</p>}

          <button
            onClick={envoyer}
            disabled={isPending}
            className="w-full rounded-xl bg-d5-gold py-3.5 text-sm font-bold text-black transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {isPending ? "Envoi…" : "Enregistrer"}
          </button>
        </div>
      )}
    </div>
  );
}

function quand(date: string): string {
  const jours = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  if (jours <= 0) return "aujourd'hui";
  if (jours < 31) return `il y a ${jours} jour${jours > 1 ? "s" : ""}`;
  const mois = Math.round(jours / 30);
  return `il y a ${mois} mois`;
}

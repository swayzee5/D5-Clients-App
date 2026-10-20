export const dynamic = "force-dynamic";

// Le dépôt d'une photo tient sous une minute, pas sous les dix secondes par
// défaut d'une fonction serverless.
export const maxDuration = 60;

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  ANGLES,
  comparer,
  listerPhotos,
  type AnglePhoto,
  type PhotoProgression,
} from "@/lib/queries/progression-photos";
import { PhotosProgression } from "@/components/progression/PhotosProgression";
import { VideoProgression } from "@/components/progression/VideoProgression";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mes photos — Progression" };

/**
 * Les photos de progression : face, dos, profil.
 *
 * Pourquoi cet écran existe, alors que le poids et les mensurations sont déjà
 * enregistrés : la balance ment pour ce public. Un homme de quarante-cinq ans
 * qui reprend perd du gras et prend du muscle en même temps, son poids ne
 * bouge pas pendant six semaines, il en conclut que rien ne marche et il
 * arrête — précisément quand son corps commence à changer.
 *
 * La comparaison est présentée avant la prise de vue, et non après : c'est
 * elle qui donne envie de faire la suivante.
 */
export default async function PhotosProgressionPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const photos = await listerPhotos(session.user.id).catch(() => [] as PhotoProgression[]);
  const comparaisons = comparer(photos);

  // listerPhotos rend du plus récent au plus ancien : la première rencontrée
  // pour un angle est donc la dernière prise.
  const derniereParAngle: Partial<Record<AnglePhoto, PhotoProgression>> = {};
  for (const p of photos) {
    if (!derniereParAngle[p.angle]) derniereParAngle[p.angle] = p;
  }

  const avecEcart = comparaisons.filter((c) => c.derniere !== null);

  return (
    <div className="space-y-5 pb-8">
      <Link
        href="/progression"
        className="inline-flex items-center gap-1.5 text-sm text-d5-muted transition-colors hover:text-white"
      >
        <ArrowLeft size={14} />
        Progression
      </Link>

      <div>
        <h1 className="text-xl font-bold text-white">Mes photos</h1>
        <p className="mt-1 text-sm leading-relaxed text-d5-muted">
          Une fois par mois suffit. La balance peut stagner pendant six semaines pendant que
          ta silhouette change — ces photos sont ce qui te le montrera.
        </p>
      </div>

      {avecEcart.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-d5-muted">
            Ce qui a changé
          </h2>
          {avecEcart.map((c) => (
            <div key={c.angle} className="card space-y-2">
              <p className="text-sm font-semibold text-white">{c.label}</p>
              <div className="grid grid-cols-2 gap-2">
                <figure className="space-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/progression/photo/${c.premiere.id}`}
                    alt={`${c.label} au départ`}
                    className="aspect-[3/4] w-full rounded-xl bg-black object-contain"
                  />
                  <figcaption className="text-center text-xs text-d5-muted">
                    {dateCourte(c.premiere.date)}
                  </figcaption>
                </figure>
                <figure className="space-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/progression/photo/${c.derniere!.id}`}
                    alt={`${c.label} aujourd'hui`}
                    className="aspect-[3/4] w-full rounded-xl bg-black object-contain"
                  />
                  <figcaption className="text-center text-xs text-d5-muted">
                    {dateCourte(c.derniere!.date)}
                  </figcaption>
                </figure>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="pt-1 text-xs font-semibold uppercase tracking-wider text-d5-muted">
          {photos.length === 0 ? "Tes trois photos de départ" : "Mettre à jour"}
        </h2>
        <PhotosProgression angles={ANGLES} derniereParAngle={derniereParAngle} />
        <VideoProgression derniere={derniereParAngle.video ?? null} />
      </section>

      <p className="px-1 text-xs leading-relaxed text-d5-muted">
        Ces photos sont privées. Seul ton coach y a accès, et elles ne sont jamais utilisées
        publiquement sans que tu l&apos;aies autorisé explicitement.
      </p>
    </div>
  );
}

function dateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" });
}

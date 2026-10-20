import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getPhoto } from "@/lib/queries/progression-photos";
import { lire } from "@/lib/photos-privees";

/**
 * Sert une photo de progression, après vérification.
 *
 * Contrôle volontairement strict : seul le client qui a envoyé la photo peut
 * la voir depuis cette application. Le coach passe par le CRM, qui est une
 * autre application avec sa propre authentification.
 *
 * `private, no-store` : ces images n'ont rien à faire dans le cache d'un
 * intermédiaire, et le gain d'un cache sur une photo consultée deux fois est
 * nul.
 */

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Non autorisé", { status: 401 });

  const photo = await getPhoto(params.id).catch(() => null);
  if (!photo) return new Response("Introuvable", { status: 404 });

  // Même réponse que pour une photo inexistante : distinguer les deux
  // apprendrait à un curieux quels identifiants existent.
  if (photo.clientId !== session.user.id) return new Response("Introuvable", { status: 404 });

  const fichier = await lire(photo.cheminPhoto);
  if (!fichier) return new Response("Introuvable", { status: 404 });

  return new Response(fichier.corps, {
    headers: { "Content-Type": fichier.type, "Cache-Control": "private, no-store" },
  });
}

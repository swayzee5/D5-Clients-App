import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getRepas } from "@/lib/queries/journal-repas";
import { lirePhoto } from "@/lib/photo-repas";

/**
 * Sert la photo d'un repas, après vérification.
 *
 * Les photos sont déposées en accès privé : elles n'ont pas d'adresse publique
 * et ne peuvent être lues que par là. Le contrôle est simple et volontairement
 * strict — seul le client qui a envoyé la photo peut la voir depuis cette
 * application. Le coach, lui, passe par le CRM, qui est une autre application
 * avec sa propre authentification.
 *
 * `private, no-store` plutôt qu'un cache long : une image de ce type ne doit
 * pas rester dans le cache d'un proxy partagé, et le gain d'un cache sur une
 * photo consultée deux ou trois fois est nul.
 */

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Non autorisé", { status: 401 });

  const repas = await getRepas(params.id).catch(() => null);
  if (!repas) return new Response("Introuvable", { status: 404 });

  // Même réponse que pour une photo inexistante : distinguer les deux
  // apprendrait à un curieux quels identifiants existent.
  if (repas.clientId !== session.user.id) return new Response("Introuvable", { status: 404 });

  const photo = await lirePhoto(repas.photoPath);
  if (!photo) return new Response("Introuvable", { status: 404 });

  return new Response(photo.corps, {
    headers: {
      "Content-Type": photo.type,
      "Cache-Control": "private, no-store",
    },
  });
}

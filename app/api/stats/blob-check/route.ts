import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { jetonBlob, nomVariableBlob } from "@/lib/blob-token";

/**
 * Teste le stockage, et dit ce qui coince.
 *
 * L'échec se produisait dans le téléphone, au milieu d'un envoi direct vers
 * le stockage : le serveur ne le voyait donc jamais passer, et le client
 * n'avait qu'un message générique. Trois causes possibles — jeton absent,
 * dépôt privé refusé, store injoignable — et aucun moyen de les distinguer à
 * distance.
 *
 * La route dépose elle-même deux fichiers minuscules, un privé et un public,
 * puis les efface. Ce qu'elle renvoie est le message exact du stockage, pas
 * une interprétation.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

async function essayer(acces: "private" | "public") {
  const chemin = `diagnostic/test-${Date.now()}-${acces}.txt`;
  try {
    const depot = await put(chemin, "test", {
      token: jetonBlob(),
      access: acces,
      contentType: "text/plain",
      addRandomSuffix: false,
    });
    // Rien ne doit rester : un fichier de test oublié dans un store est un
    // fichier dont personne ne saura plus à quoi il servait.
    await del(depot.url, { token: jetonBlob() }).catch(() => {});
    return { ok: true };
  } catch (err) {
    return { ok: false, erreur: String(err).slice(0, 400) };
  }
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const jeton = jetonBlob();
  if (!jeton) {
    return NextResponse.json({
      jeton: "absent",
      diagnostic:
        "BLOB_READ_WRITE_TOKEN n'est pas lu par ce déploiement. Le store est peut-être connecté, mais le déploiement en cours date d'avant la connexion.",
    });
  }

  const prive = await essayer("private");
  const publique = await essayer("public");

  return NextResponse.json({
    // Le jeton n'est jamais renvoyé : seulement de quoi reconnaître qu'il y en
    // a un, et lequel.
    jeton: `présent dans ${nomVariableBlob()} (${jeton.length} caractères)`,
    dépôtPrivé: prive,
    dépôtPublic: publique,
    diagnostic: prive.ok
      ? "Le stockage accepte le dépôt privé. L'échec vient d'ailleurs — probablement de l'autorisation délivrée au téléphone."
      : publique.ok
      ? "Le store refuse le privé mais accepte le public. C'est la cause de l'échec."
      : "Le store refuse les deux : jeton invalide, ou store supprimé ou plein.",
  });
}

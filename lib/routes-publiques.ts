/**
 * Chemins accessibles sans compte.
 *
 * Deux gardiens barrent l'app : le middleware et le callback `authorized` de
 * NextAuth. Les deux redirigeaient tout vers /login sauf /login lui-même.
 * Ajouter une page publique d'un seul côté donne une page qui marche en
 * apparence et redirige dans certains cas, ce qui est pire qu'une page
 * inaccessible — on ne le voit pas en testant.
 *
 * D'où cette liste unique, lue par les deux.
 */
export const ROUTES_PUBLIQUES = ["/login", "/rejoindre"];

export function estRoutePublique(pathname: string): boolean {
  return ROUTES_PUBLIQUES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

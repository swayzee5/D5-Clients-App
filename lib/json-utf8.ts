import { NextResponse } from "next/server";

/**
 * Réponse JSON avec l'encodage déclaré.
 *
 * NextResponse.json n'écrit que « application/json », sans charset. La plupart
 * des clients supposent alors UTF-8, mais pas tous : Safari sur iPhone
 * interprète en latin-1 et affiche « bloquÃ© » au lieu de « bloqué ». Ces
 * routes sont lues à l'œil nu, dans un navigateur, souvent sur téléphone —
 * donc l'encodage se déclare.
 */
export function jsonUtf8(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

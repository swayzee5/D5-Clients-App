"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";

/**
 * Une section entièrement terminée, réduite à une ligne dépliable.
 *
 * La page du challenge s'allongeait à mesure qu'on avançait, alors qu'elle
 * devrait faire l'inverse : ce qui est fait n'appelle plus aucune décision.
 * Faire défiler douze cartes vertes pour atteindre la seule action restante
 * est le contraire de fluide.
 *
 * Dépliable, et pas seulement repliée : les séances restent utiles après les
 * trois premières, et un module se relit. Une ligne qui renvoie vers un
 * contenu devenu inaccessible serait un mensonge de plus à l'écran.
 */
export function SectionTerminee({
  titre,
  detail,
  children,
}: {
  titre: string;
  detail: string;
  children?: React.ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);

  if (ouvert) {
    return (
      <section className="space-y-2">
        <button
          onClick={() => setOuvert(false)}
          className="flex w-full items-center gap-2 py-1 text-left"
        >
          <CheckCircle2 size={14} className="shrink-0 text-green-400" />
          <span className="flex-1 text-sm font-semibold text-gray-300">{titre}</span>
          <ChevronDown size={14} className="shrink-0 rotate-180 text-d5-muted" />
        </button>
        {children}
      </section>
    );
  }

  return (
    <button
      onClick={() => setOuvert(true)}
      disabled={!children}
      className="flex w-full items-center gap-3 rounded-2xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-left"
    >
      <CheckCircle2 size={18} className="shrink-0 text-green-400" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-gray-300">{titre}</span>
        <span className="block text-xs text-d5-muted">{detail}</span>
      </span>
      {children ? <ChevronDown size={16} className="shrink-0 text-d5-muted" /> : null}
    </button>
  );
}

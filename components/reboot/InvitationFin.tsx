"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { messageInvitation } from "@/lib/invitation";

/**
 * L'invitation d'un proche, une fois la décision prise.
 *
 * Elle était une ligne parmi douze sur la page du challenge, au milieu des
 * séances et des modules — autant dire nulle part. Or c'est le bouche-à-
 * oreille qui remplit la cohorte suivante, et il ne se déclenche qu'à un
 * moment précis : juste après que quelqu'un a vu ce que sept jours lui ont
 * rapporté, et répondu pour lui-même.
 *
 * Placée avant, elle serait une distraction au moment où il décide pour sa
 * propre santé. Placée ici, elle tombe sur un homme content de lui, qui vient
 * de lire son écart de score. C'est tout l'écart entre un partage demandé et
 * un partage envoyé.
 *
 * Le partage natif du téléphone est tenté en premier : il ouvre la liste des
 * contacts et laisse choisir WhatsApp ou SMS en un geste. Sinon, le message
 * est copié — et s'il ne peut pas l'être, il reste affiché, sélectionnable.
 */
export function InvitationFin({
  firstName,
  points,
}: {
  firstName?: string | null;
  /** Points gagnés sur le score global. Null tant que le bilan n'est pas fait. */
  points: number | null;
}) {
  const [copie, setCopie] = useState(false);
  const [texteVisible, setTexteVisible] = useState(false);
  const message = messageInvitation(firstName, points);

  async function partager() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: message });
        return;
      } catch {
        // Partage refusé ou annulé : la copie prend le relais.
      }
    }
    try {
      await navigator.clipboard.writeText(message);
      setCopie(true);
      setTexteVisible(true);
      setTimeout(() => setCopie(false), 3000);
    } catch {
      setTexteVisible(true);
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-d5-border bg-d5-surface p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-d5-gold/10">
          <Share2 size={18} className="text-d5-gold" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">Ce challenge t&apos;a fait du bien ?</p>
          <p className="text-xs text-d5-muted">Fais-en profiter un proche.</p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-gray-300">
        Un collègue, un frère, un pote qui répète depuis deux ans qu&apos;il
        faudrait qu&apos;il s&apos;y remette. Le message est déjà écrit, tu
        n&apos;as qu&apos;à l&apos;envoyer.
      </p>

      <button
        type="button"
        onClick={partager}
        className="w-full rounded-xl bg-d5-gold py-3.5 text-sm font-bold text-black transition-transform active:scale-[0.98]"
      >
        {copie ? "✓ Message copié" : "Envoyer l'invitation"}
      </button>

      {texteVisible && (
        <p className="whitespace-pre-line rounded-xl bg-d5-surface-2 p-3 text-xs leading-relaxed text-gray-400">
          {message}
        </p>
      )}
    </section>
  );
}

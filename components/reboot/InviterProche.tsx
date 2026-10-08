"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { messageInvitation } from "@/lib/invitation";

/**
 * Inviter un proche, à tout moment du challenge.
 *
 * Le partage n'existait qu'à la toute fin du bilan. Or l'envie de parler du
 * challenge ne vient pas qu'au septième jour : elle vient surtout juste après
 * une séance réussie. Attendre la fin, c'est rater ce moment-là.
 *
 * Le partage natif du téléphone est tenté en premier — il ouvre la liste des
 * contacts et laisse choisir WhatsApp, SMS ou autre, en un geste. Les
 * navigateurs qui ne le proposent pas retombent sur la copie du message.
 */
export function InviterProche({ firstName, points }: { firstName?: string | null; points: number | null }) {
  const [ouvert, setOuvert] = useState(false);
  const [copie, setCopie] = useState(false);
  const message = messageInvitation(firstName, points);

  async function partager() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text: message });
        return;
      } catch {
        // Partage refusé ou annulé : on laisse la copie prendre le relais.
      }
    }
    try {
      await navigator.clipboard.writeText(message);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      // Presse-papier refusé : le texte reste affiché et sélectionnable.
      setOuvert(true);
    }
  }

  return (
    <section className="space-y-2">
      <button
        onClick={() => { setOuvert(true); void partager(); }}
        className="card flex w-full items-center gap-3 text-left transition-all active:scale-[0.98] hover:border-d5-gold/30"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-d5-surface-2">
          <Share2 size={18} className="text-d5-gold" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Inviter un proche</p>
          <p className="text-xs text-d5-muted">
            {copie ? "Message copié ✓" : "Quelqu'un autour de toi dit « il faudrait que je m'y remette »"}
          </p>
        </div>
      </button>

      {ouvert && (
        <div className="card space-y-3">
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-300">{message}</p>
          <button
            onClick={partager}
            className="w-full rounded-xl border border-d5-border bg-d5-surface-2 py-3 text-sm font-medium text-white"
          >
            {copie ? "✓ Copié !" : "Copier le message"}
          </button>
        </div>
      )}
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MessageCircle, Lock, ChevronRight } from "lucide-react";
import { recordNextWhatsappMessage } from "./whatsapp-actions";

/**
 * Les trois messages du groupe WhatsApp, validables à tout moment.
 *
 * Avant, un message ne pouvait être déclaré que dans l'écran qui suit
 * immédiatement la validation d'une séance, écran qui proposait « passer cette
 * étape ». Qui le passait ne pouvait plus jamais revenir : la séance était
 * terminée, l'enchaînement ne se rejouait pas, et le point était perdu pour de
 * bon. Or poster le soir plutôt que sur le tapis est le comportement le plus
 * ordinaire du monde.
 *
 * La carte devient donc un bouton : le texte s'affiche, on le copie, on
 * confirme. C'est toujours déclaratif, personne ne peut vérifier un envoi
 * WhatsApp depuis une page web ; mais le coach, lui, voit son groupe.
 */

type Props = {
  clientId: string;
  waCompleted: number;
  sessionsCompleted: number;
  goal: number;
};

export function WhatsappSection({ clientId, waCompleted, sessionsCompleted, goal }: Props) {
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [copie, setCopie] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const messages = [1, 2, 3].map((ordinal) => ({
    ordinal,
    done: waCompleted >= ordinal,
    locked: sessionsCompleted < ordinal,
  }));

  const texte = ouvert ? `Séance ${ouvert}/3 validée 🔥🔥🔥` : "";

  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      // Presse-papier refusé par le navigateur : le texte reste visible et
      // sélectionnable à la main, donc rien n'est bloqué.
      setCopie(false);
    }
  }

  function confirmer() {
    startTransition(async () => {
      await recordNextWhatsappMessage(clientId);
      setOuvert(null);
      router.refresh();
    });
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between py-1">
        <h2 className="text-white font-semibold text-sm">Messages WhatsApp</h2>
        <span className="text-xs text-d5-muted">{Math.min(waCompleted, goal)}/{goal} envoyés</span>
      </div>

      {messages.map(({ ordinal, done, locked }) => (
        <button
          key={ordinal}
          type="button"
          disabled={done || locked}
          onClick={() => setOuvert(ordinal)}
          className={`card flex w-full items-center gap-3 text-left transition-all ${
            done
              ? "border-green-500/20 bg-green-500/5"
              : locked
                ? "opacity-50"
                : "border-d5-gold/20 active:scale-[0.98]"
          }`}
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            done ? "bg-green-500/10" : "bg-d5-surface-2"
          }`}>
            {done
              ? <CheckCircle2 size={18} className="text-green-400" />
              : locked
                ? <Lock size={16} className="text-d5-muted" />
                : <MessageCircle size={18} className="text-d5-gold" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${done ? "text-gray-400" : locked ? "text-gray-500" : "text-white"}`}>
              Message {ordinal}/3
            </p>
            <p className="text-xs text-d5-muted">
              {done
                ? "Envoyé ✓"
                : locked
                  ? `Complète la séance ${ordinal} d'abord`
                  : "Appuie ici quand tu l'as posté dans le groupe"}
            </p>
          </div>
          {done
            ? <span className="shrink-0 text-xs font-medium text-green-400">✓</span>
            : !locked && <ChevronRight size={15} className="shrink-0 text-d5-muted" />}
        </button>
      ))}

      {ouvert !== null && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-sm space-y-4 rounded-2xl border border-gray-800 bg-gray-900 p-5">
            <div>
              <p className="font-bold text-white">Message {ouvert}/3</p>
              <p className="mt-0.5 text-xs text-d5-muted">Copie-le et colle-le dans le groupe WhatsApp D5</p>
            </div>

            <div className="rounded-xl border border-d5-gold/20 bg-d5-surface-2 p-3.5">
              <p className="text-sm leading-relaxed text-white">{texte}</p>
            </div>

            <button
              onClick={copier}
              className="w-full rounded-xl border border-d5-border bg-d5-surface-2 py-3 text-sm font-medium text-white transition-all active:scale-[0.98]"
            >
              {copie ? "✓ Copié !" : "Copier le message"}
            </button>

            <button
              onClick={confirmer}
              disabled={isPending}
              className="w-full rounded-xl bg-d5-gold py-3.5 text-sm font-bold text-black transition-colors active:scale-[0.98] disabled:opacity-60"
            >
              {isPending ? "Enregistrement…" : "Message envoyé ✓"}
            </button>

            <button
              onClick={() => setOuvert(null)}
              className="w-full py-1 text-center text-xs text-d5-muted hover:text-white"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

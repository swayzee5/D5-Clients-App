"use client";
import { useRef, useTransition, useState } from "react";
import { submitComment } from "./actions";

export default function CommentForm({
  clientId,
  programId,
}: {
  clientId: string;
  programId: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  const action = submitComment.bind(null, clientId, programId);

  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-1">Laisser un message à ton coach</h3>
      <p className="text-d5-muted text-xs mb-3">Question, ressenti, retour sur ton programme...</p>

      {sent ? (
        <div className="flex items-center gap-2 py-3 text-green-400 text-sm">
          <span>✓</span>
          <span>Message envoyé — ton coach va le voir !</span>
        </div>
      ) : (
        <form
          ref={ref}
          action={(formData) => {
            startTransition(async () => {
              await action(formData);
              ref.current?.reset();
              setSent(true);
              setTimeout(() => setSent(false), 4000);
            });
          }}
          className="space-y-3"
        >
          <textarea
            name="content"
            rows={3}
            placeholder="Ex: J'ai du mal avec les tractions, tu as des conseils ?"
            className="w-full bg-d5-surface border border-d5-border rounded-xl px-4 py-3 text-white placeholder-d5-muted text-sm resize-none focus:outline-none focus:ring-1 focus:ring-d5-gold/50"
            required
          />
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 rounded-xl bg-d5-gold text-black font-semibold text-sm disabled:opacity-50 transition-opacity"
          >
            {isPending ? "Envoi..." : "Envoyer"}
          </button>
        </form>
      )}
    </div>
  );
}

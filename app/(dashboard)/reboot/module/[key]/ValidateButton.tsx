"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { validateModule } from "./actions";

type Step = "idle" | "whatsapp" | "done";

const WHATSAPP_MESSAGE = "Lecture documentation complétée ✅";

export default function ValidateButton({
  taskKey,
  isDone,
  isLastModule,
}: {
  taskKey: string;
  isDone: boolean;
  isLastModule: boolean;
}) {
  const [step, setStep] = useState<Step>("idle");
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    await navigator.clipboard.writeText(WHATSAPP_MESSAGE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isDone || step === "done") {
    return (
      <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
        <CheckCircle2 size={18} className="text-green-400" />
        <p className="text-green-400 font-semibold text-sm">Module validé</p>
      </div>
    );
  }

  if (step === "whatsapp") {
    return (
      <div className="card space-y-4">
        <div className="text-center space-y-1">
          <p className="text-3xl">📲</p>
          <p className="text-white font-bold">Partage dans le groupe !</p>
          <p className="text-d5-muted text-xs mt-0.5">Copie ce message et colle-le dans le groupe WhatsApp</p>
        </div>
        <div className="bg-d5-surface-2 border border-d5-gold/20 rounded-xl p-3.5">
          <p className="text-white text-sm">{WHATSAPP_MESSAGE}</p>
        </div>
        <button onClick={copyMessage}
          className="w-full border border-d5-border hover:border-white/30 bg-d5-surface-2 text-white rounded-xl py-3 text-sm font-medium transition-all active:scale-[0.98]">
          {copied ? "✓ Copié !" : "Copier le message"}
        </button>
        <button onClick={() => setStep("done")}
          className="w-full bg-d5-gold hover:bg-d5-gold/90 text-black font-bold rounded-xl py-3.5 text-sm transition-colors active:scale-[0.98]">
          Message envoyé ✓
        </button>
        <button onClick={() => setStep("done")}
          className="w-full text-center text-xs text-d5-muted hover:text-white transition-colors py-1">
          Passer cette étape
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await validateModule(taskKey);
          if (isLastModule) {
            setStep("whatsapp");
          } else {
            setStep("done");
          }
        })
      }
      disabled={isPending}
      className="w-full bg-d5-gold hover:bg-d5-gold/90 disabled:opacity-60 text-black font-bold rounded-xl py-3.5 text-sm transition-colors active:scale-[0.98]">
      {isPending ? "Validation..." : "J'ai compris, je valide ✓"}
    </button>
  );
}

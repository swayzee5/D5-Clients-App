"use client";

import { useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { validateModule } from "./actions";

export default function ValidateButton({ taskKey, isDone }: { taskKey: string; isDone: boolean }) {
  const [isPending, startTransition] = useTransition();

  if (isDone) {
    return (
      <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
        <CheckCircle2 size={18} className="text-green-400" />
        <p className="text-green-400 font-semibold text-sm">Module validé</p>
      </div>
    );
  }

  return (
    <button
      onClick={() => startTransition(() => validateModule(taskKey))}
      disabled={isPending}
      className="w-full bg-d5-gold hover:bg-d5-gold/90 disabled:opacity-60 text-black font-bold rounded-xl py-3.5 text-sm transition-colors active:scale-[0.98]"
    >
      {isPending ? "Validation..." : "J’ai compris, je valide ✓"}
    </button>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { completeSession } from "./actions";

export function CompleteButton({ clientId, sessionId }: { clientId: string; sessionId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!confirm("Marquer cette séance comme terminée ?")) return;
    startTransition(async () => {
      await completeSession(clientId, sessionId);
      router.refresh();
    });
  }

  return (
    <button type="button" onClick={handleClick} disabled={isPending}
      className="w-full py-3.5 rounded-xl bg-d5-gold text-black font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-all">
      {isPending ? "…" : <><CheckCircle2 size={16} />Séance terminée !</>}
    </button>
  );
}

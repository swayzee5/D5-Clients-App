export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import { getRebootDiagnostic } from "@/lib/queries/reboot-diagnostic";
import { RebootScorePanel } from "@/components/reboot/RebootScorePanel";
import { QUESTIONS, choiceLabel } from "@/lib/reboot-diagnostic";

export const metadata: Metadata = { title: "Mon Reboot Score" };

/**
 * Le Reboot Score, consultable après coup.
 *
 * Un score vu une seule fois, à la validation du diagnostic, ne sert à rien :
 * c'est le point de comparaison de la fin des 7 jours, il doit rester sous les
 * yeux. La page rappelle aussi ses propres réponses — celles qu'il a écrites au
 * jour 1 sont souvent ce qui remotive au jour 4.
 */
export default async function RebootScorePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const diagnostic = await getRebootDiagnostic(session.user.id);

  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-center gap-3 pt-1">
        <Link
          href="/reboot"
          className="-ml-2 rounded-xl p-2 text-d5-muted transition-colors hover:text-white"
          aria-label="Retour au Reboot"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="text-xl font-black text-white">Mon Reboot Score</h1>
      </div>

      {!diagnostic ? (
        <div className="card text-center">
          <p className="text-sm text-d5-muted">
            Votre diagnostic de départ n&apos;a pas encore été rempli.
          </p>
        </div>
      ) : (
        <>
          <RebootScorePanel scores={diagnostic.scores} submittedAt={diagnostic.submitted_at} />

          <div className="space-y-4">
            <p className="text-sm font-semibold text-white">Ce que vous m&apos;aviez écrit</p>
            {QUESTIONS.map((question) => {
              const answer = diagnostic.answers[question.id as keyof typeof diagnostic.answers];
              if (question.kind === "ratings") return null;

              let value: string;
              if (question.kind === "text") {
                value = String(answer ?? "").trim();
              } else if (question.kind === "percent") {
                value = typeof answer === "number" ? `${answer} %` : "";
              } else if (question.kind === "yesno") {
                const entourage = diagnostic.answers.entourage;
                if (!entourage?.value) {
                  value = "";
                } else {
                  const detail = entourage.detail?.trim();
                  value =
                    (entourage.value === "oui" ? "Oui" : "Non") + (detail ? ` — ${detail}` : "");
                }
              } else {
                value = choiceLabel(question.id, answer as string | undefined);
              }

              if (!value || value === "—") return null;

              return (
                <div key={question.id} className="card space-y-1.5">
                  <p className="text-xs leading-snug text-d5-muted">{question.prompt}</p>
                  <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-white">
                    {value}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

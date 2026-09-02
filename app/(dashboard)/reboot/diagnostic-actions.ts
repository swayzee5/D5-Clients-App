"use server"

import { auth } from "@/auth"

import { saveRebootDiagnostic } from "@/lib/queries/reboot-diagnostic"
import {
  QUESTIONNAIRE_VERSION,
  computeScores,
  missingAnswers,
  type Answers,
} from "@/lib/reboot-diagnostic"

export type SubmitResult =
  | { ok: true; scores: ReturnType<typeof computeScores> }
  | { ok: false; error: string }

/**
 * Enregistre le diagnostic de départ.
 *
 * La complétude est revérifiée ici et pas seulement dans le formulaire : le
 * bouton est certes désactivé tant qu'il manque une réponse, mais une action
 * serveur reste appelable directement, et un diagnostic incomplet fausserait le
 * score sans que personne ne s'en aperçoive.
 */
export async function submitRebootDiagnostic(answers: Answers): Promise<SubmitResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Session expirée. Reconnectez-vous." }

  const missing = missingAnswers(answers)
  if (missing.length > 0) {
    return { ok: false, error: "Il reste des questions sans réponse." }
  }

  const scores = computeScores(answers.notes)

  try {
    await saveRebootDiagnostic(session.user.id, answers, scores, QUESTIONNAIRE_VERSION)
  } catch (err) {
    // Remonté à l'écran plutôt qu'avalé : le formulaire étant bloquant, un
    // échec silencieux laisserait le participant coincé sans explication.
    console.error("[reboot-diagnostic] enregistrement impossible", err)
    return { ok: false, error: "Enregistrement impossible. Vérifiez votre connexion et réessayez." }
  }

  // Surtout pas de revalidatePath ici. Le layout se re-rendrait aussitôt,
  // constaterait que le diagnostic existe désormais, et remplacerait l'écran de
  // score par le tableau de bord — le participant voyait son résultat une
  // fraction de seconde. C'est le bouton « Accéder à mon Reboot » qui déclenche
  // le rafraîchissement, quand la personne a fini de lire.
  return { ok: true, scores }
}

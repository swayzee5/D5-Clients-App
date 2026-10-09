export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Zap, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { getRebootSessions } from "@/lib/queries/reboot";
import { getRebootDiagnostic } from "@/lib/queries/reboot-diagnostic";
import { getBilan } from "@/lib/queries/reboot-bilan";
import { pool } from "@/lib/db";
import { InviterProche } from "@/components/reboot/InviterProche";
import { prochaineEtape } from "@/lib/reboot-prochaine-etape";
import { SectionTerminee } from "@/components/reboot/SectionTerminee";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reboot 40" };

const MODULES = [
  { key: "regularite",  emoji: "🔥", title: "La régularité avant l'intensité", teaser: "Le secret de la transformation durable" },
  { key: "hydratation", emoji: "💧", title: "L'hydratation, ton moteur",        teaser: "2L minimum — comprendre pourquoi" },
  { key: "sommeil",     emoji: "😴", title: "Le sommeil, ton meilleur allié",   teaser: "Quand le vrai travail se fait" },
  { key: "nutrition",   emoji: "🥗", title: "Protéines à chaque repas",          teaser: "La règle simple qui change tout" },
];

const DEFAULT_WELCOME =
  "Vas-y à ton rythme. Ce qui compte, c'est de compléter chaque étape — pas de le faire vite. Tu as tout ce qu'il faut.";

const SEANCES_GOAL = 3;
const WA_GOAL = 3;
const MODULES_GOAL = 4;
const TOTAL_TASKS = SEANCES_GOAL + WA_GOAL + MODULES_GOAL;

export default async function RebootPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const clientId = session.user.id;

  let sessions: Awaited<ReturnType<typeof getRebootSessions>> = [];
  let completedModules: string[] = [];
  let waCompleted = 0;
  let welcomeMessage = DEFAULT_WELCOME;
  let completionDates: { first: string; last: string } | null = null;

  try { sessions = await getRebootSessions(clientId); } catch {}

  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS reboot_task_completions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id TEXT NOT NULL,
      task_key TEXT NOT NULL, completed_at TIMESTAMPTZ DEFAULT now(), UNIQUE(client_id, task_key)
    )`);
    const { rows } = await pool.query(`SELECT task_key FROM reboot_task_completions WHERE client_id = $1`, [clientId]);
    completedModules = rows.map((r: { task_key: string }) => r.task_key);
  } catch {}

  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS reboot_whatsapp_completions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id TEXT NOT NULL, session_id TEXT NOT NULL,
      sent_at TIMESTAMPTZ DEFAULT now(), UNIQUE(client_id, session_id)
    )`);
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM reboot_whatsapp_completions WHERE client_id = $1`,
      [clientId]
    );
    waCompleted = parseInt(rows[0]?.cnt ?? 0);
  } catch {}

  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ DEFAULT now())`);
    const { rows } = await pool.query(`SELECT value FROM app_settings WHERE key = 'reboot_welcome_message'`);
    if (rows[0]?.value) welcomeMessage = rows[0].value;
  } catch {}


  // Seules les séances de renforcement comptent dans l'objectif : un
  // échauffement suivi ne vaut pas une séance du challenge, sinon les trois
  // étapes seraient validées en un quart d'heure de mobilité.
  const sessionsCompleted = sessions.filter((s) => s.completed && !s.is_bonus).length;

  const seancesDoneForProgress = Math.min(sessionsCompleted, SEANCES_GOAL);
  const waDoneForProgress = Math.min(waCompleted, WA_GOAL);
  const modulesDoneForProgress = Math.min(completedModules.length, MODULES_GOAL);

  const totalCompleted = seancesDoneForProgress + waDoneForProgress + modulesDoneForProgress;
  const progressPct = Math.round((totalCompleted / TOTAL_TASKS) * 100);
  const allDone = totalCompleted === TOTAL_TASKS;

  if (allDone) {
    try {
      const [{ rows: sRows }, { rows: mRows }] = await Promise.all([
        pool.query(`SELECT MIN(completed_at) as first, MAX(completed_at) as last FROM reboot_completions WHERE client_id = $1::uuid`, [clientId]),
        pool.query(`SELECT MIN(completed_at) as first, MAX(completed_at) as last FROM reboot_task_completions WHERE client_id = $1`, [clientId]),
      ]);
      const allDates = [sRows[0]?.first, sRows[0]?.last, mRows[0]?.first, mRows[0]?.last]
        .filter(Boolean).map((d) => new Date(d as string).getTime());
      if (allDates.length > 0) {
        const fmt = (ms: number) => new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
        completionDates = { first: fmt(Math.min(...allDates)), last: fmt(Math.max(...allDates)) };
      }
    } catch {}
  }

  // Le Reboot Score, s'il a été calculé : c'est le point de comparaison de la
  // fin des 7 jours, il doit rester accessible et pas seulement s'afficher une
  // fois à la validation du diagnostic.
  const diagnostic = await getRebootDiagnostic(clientId);
  // Le bilan n'est proposé qu'une fois les dix étapes faites, et une seule
  // fois : c'est une mesure datée, pas un formulaire qu'on rejoue.
  const bilan = allDone ? await getBilan(clientId) : null;

  const etape = prochaineEtape({
    seances: sessionsCompleted,
    messages: waCompleted,
    modules: completedModules.length,
    bilanFait: bilan !== null,
    premierModuleAFaire: MODULES.find((m) => !completedModules.includes(m.key))?.key ?? null,
  });

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-gradient-to-br from-d5-gold/20 to-transparent border border-d5-gold/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={14} className="text-d5-gold" />
          <span className="text-d5-gold text-xs font-semibold uppercase tracking-wider">Challenge offert</span>
        </div>
        <h1 className="text-xl font-bold text-white">Reboot 40</h1>
        <p className="text-gray-400 text-sm mt-0.5">{TOTAL_TASKS} étapes pour relancer la machine</p>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-gray-400">{totalCompleted}/{TOTAL_TASKS} étapes complétées</span>
            <span className="text-d5-gold font-semibold">{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-d5-gold rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        {diagnostic && (
          <Link
            href="/reboot/score"
            className="mt-4 flex items-center gap-3 rounded-xl bg-black/25 px-4 py-3 transition-colors hover:bg-black/40"
          >
            <span className="text-2xl font-black text-d5-gold">{diagnostic.scores.global}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-xs text-gray-400">Mon Reboot Score de départ</span>
              <span className="block text-xs text-gray-500">Voir le détail et mes réponses</span>
            </span>
            <ArrowRight size={16} className="text-d5-gold shrink-0" />
          </Link>
        )}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-d5-gold font-semibold uppercase tracking-wider mb-1">Mot de ton coach</p>
          <p className="text-gray-300 text-sm leading-relaxed">{welcomeMessage}</p>
        </div>
        {/* Certificate link — always visible for reboot clients */}
        <div className="mt-3 pt-3 border-t border-white/5 flex justify-end">
          <Link
            href="/reboot/certificat"
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-d5-gold transition-colors"
          >
            <span>🏅</span>
            <span>Mon certificat</span>
            {!allDone && <span className="text-gray-700">🔒</span>}
          </Link>
        </div>
      </div>


      {/* La seule décision retirée au participant : par où commencer. Tout le
          reste de la page est toujours là, mais rangé en dessous. */}
      <Link
        href={etape.href}
        className="flex items-center gap-4 rounded-2xl border-2 border-d5-gold bg-d5-gold/10 p-5 transition-transform active:scale-[0.98]"
      >
        <span className="text-4xl">{etape.emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-d5-gold">
            Prochaine étape
          </span>
          <span className="block text-lg font-bold leading-tight text-white">{etape.titre}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-d5-muted">{etape.detail}</span>
        </span>
        <ArrowRight size={20} className="shrink-0 text-d5-gold" />
      </Link>

      {/* Sommaire, pas contenu : chaque ligne mène à son écran. La page
          montrait les séances ET les messages ET les modules les uns sous les
          autres, si bien qu'ouvrir « ta première séance » ramenait à la même
          chose. Une action nommée doit mener à un écran qui ne contient
          qu'elle. */}
      <LigneSommaire
        href="/reboot/seances"
        emoji="🏋️"
        titre="Mes séances"
        detail={`${Math.min(sessionsCompleted, SEANCES_GOAL)}/${SEANCES_GOAL} faites`}
        termine={sessionsCompleted >= SEANCES_GOAL}
      />

      <LigneSommaire
        href="/reboot/messages"
        emoji="💬"
        titre="Mes messages"
        detail={`${Math.min(waCompleted, WA_GOAL)}/${WA_GOAL} postés`}
        termine={waCompleted >= WA_GOAL}
      />

      {completedModules.length >= MODULES_GOAL ? (
        <SectionTerminee titre="Tes 4 modules sont lus" detail="Régularité, hydratation, sommeil, protéines." />
      ) : (
      <section className="space-y-2">
        <div className="flex items-center justify-between py-1">
          <h2 className="text-white font-semibold text-sm">Modules lifestyle</h2>
          <span className="text-xs text-d5-muted">{modulesDoneForProgress}/{MODULES_GOAL} validés</span>
        </div>
        {MODULES.map(({ key, emoji, title, teaser }) => {
          const done = completedModules.includes(key);
          return (
            <Link key={key} href={`/reboot/module/${key}`}>
              <div className={`card flex items-center gap-3 transition-all active:scale-[0.98] ${
                done ? "border-green-500/20 bg-green-500/5" : "hover:border-d5-gold/30"
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  done ? "bg-green-500/10" : "bg-d5-surface-2"
                }`}>
                  {done ? <CheckCircle2 size={18} className="text-green-400" /> : <span className="text-xl">{emoji}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${done ? "text-gray-400" : "text-white"}`}>{title}</p>
                  <p className="text-d5-muted text-xs">{done ? "Validé" : teaser}</p>
                </div>
                {done
                  ? <span className="text-xs text-green-400 font-medium shrink-0">✓</span>
                  : <ArrowRight size={15} className="text-d5-muted shrink-0" />}
              </div>
            </Link>
          );
        })}
      </section>

      )}

      {/* Après les modules, et visible dès le premier jour : l'envie de parler
          du challenge vient surtout juste après une séance réussie, pas au
          septième jour. */}
      <InviterProche
        firstName={session.user?.name?.split(" ")[0]}
        points={bilan && diagnostic ? bilan.scores.global - diagnostic.scores.global : null}
      />

      {allDone && (
        <div className="space-y-4 pb-4">
          <div className="bg-gradient-to-br from-d5-gold/30 via-d5-gold/10 to-transparent border-2 border-d5-gold/50 rounded-2xl p-6 text-center space-y-2">
            <div className="text-5xl">🏆</div>
            <h2 className="text-white text-xl font-bold">Challenge complété !</h2>
            {completionDates && (
              <p className="text-d5-muted text-sm">
                {/* « Du 30 septembre au 30 septembre » quand tout a été validé
                    le même jour : exact, mais ça se lit comme une erreur. */}
                {completionDates.first === completionDates.last
                  ? `Le ${completionDates.first}`
                  : `Du ${completionDates.first} au ${completionDates.last}`}
              </p>
            )}
          </div>
          <div className="card space-y-3">
            <p className="text-d5-gold text-xs font-bold uppercase tracking-wider">Ce que tu as accompli</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🏋️</span>
                <span className="text-gray-300 text-sm flex-1">3 séances complétées</span>
                <CheckCircle2 size={13} className="text-green-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base">📲</span>
                <span className="text-gray-300 text-sm flex-1">3 messages WhatsApp envoyés</span>
                <CheckCircle2 size={13} className="text-green-400" />
              </div>
              {MODULES.map((m) => (
                <div key={m.key} className="flex items-center gap-2">
                  <span className="text-base">{m.emoji}</span>
                  <span className="text-gray-300 text-sm flex-1">{m.title}</span>
                  <CheckCircle2 size={13} className="text-green-400" />
                </div>
              ))}
            </div>
          </div>
          {/* Avant le certificat : c'est la mesure qui compte, et elle se perd
              si on la propose après le trophée. */}
          <Link
            href="/reboot/bilan"
            className={`flex items-center gap-3 rounded-2xl border p-4 transition-colors ${
              bilan
                ? "border-d5-border bg-d5-surface hover:border-d5-gold/30"
                : "border-d5-gold/50 bg-d5-gold/10"
            }`}
          >
            <span className="text-2xl">📈</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-white">
                {bilan ? "Mon bilan de fin" : "Fais ton bilan"}
              </span>
              <span className="block text-xs text-d5-muted">
                {bilan
                  ? `Score ${diagnostic?.scores.global ?? "?"} → ${bilan.scores.global}`
                  : "Les 6 mêmes notes qu'au départ, pour voir ce qui a changé"}
              </span>
            </span>
            <ArrowRight size={16} className="shrink-0 text-d5-gold" />
          </Link>

          <div className="space-y-3">
            {/* Certificate download button */}
            <Link
              href="/reboot/certificat"
              className="flex items-center justify-center gap-2 py-3.5 bg-d5-gold/10 border border-d5-gold/40 text-d5-gold rounded-xl text-sm font-bold active:scale-[0.98] transition-transform"
            >
              🏅 Télécharger mon certificat PDF
            </Link>
            <p className="text-gray-400 text-sm text-center leading-relaxed">
              Tu as prouvé que tu peux être régulier, avec le travail et la famille
              par-dessus. C&apos;est exactement ce qui manque à la plupart des hommes
              de ton âge. L&apos;accompagnement va chercher la suite : un programme
              calibré sur ta récupération, la nutrition, et moi derrière toi
              pendant 6 mois.
            </p>
            <div className="bg-d5-gold text-black rounded-xl px-4 py-4 text-sm font-bold text-center cursor-pointer hover:bg-d5-gold/90 transition-colors active:scale-[0.98]">
              Réserver mon appel découverte gratuit →
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Une ligne du sommaire du challenge.
 *
 * Volontairement petite : ce n'est pas elle qui doit attirer l'œil, c'est la
 * carte « prochaine étape ». Elle existe pour que rien ne soit caché, pas pour
 * concurrencer l'action du jour.
 */
function LigneSommaire({
  href,
  emoji,
  titre,
  detail,
  termine,
}: {
  href: string;
  emoji: string;
  titre: string;
  detail: string;
  termine: boolean;
}) {
  return (
    <Link
      href={href}
      className={`card flex items-center gap-3 transition-all active:scale-[0.98] ${
        termine ? "border-green-500/20 bg-green-500/5" : "hover:border-d5-gold/30"
      }`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-d5-surface-2 text-lg">
        {emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-semibold ${termine ? "text-gray-400" : "text-white"}`}>
          {titre}
        </span>
        <span className="block text-xs text-d5-muted">{detail}</span>
      </span>
      {termine ? (
        <CheckCircle2 size={16} className="shrink-0 text-green-400" />
      ) : (
        <ArrowRight size={15} className="shrink-0 text-d5-muted" />
      )}
    </Link>
  );
}

export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { pool } from "@/lib/db";
import { getRebootSessions } from "@/lib/queries/reboot";
import CertificatClient from "./CertificatClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mon Certificat — Reboot 40" };

const MODULES_GOAL = 4;

export default async function CertificatPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Gate: reboot clients only
  const isRebootOnly = session.user?.isRebootOnly ?? false;
  if (!isRebootOnly) redirect("/dashboard");

  const clientId = session.user.id;
  const nameParts = session.user?.name?.split(" ") ?? [];
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");

  let sessions: Awaited<ReturnType<typeof getRebootSessions>> = [];
  let completedModules: string[] = [];

  try { sessions = await getRebootSessions(clientId); } catch {}

  try {
    const { rows } = await pool.query(
      `SELECT task_key FROM reboot_task_completions WHERE client_id = $1`,
      [clientId]
    );
    completedModules = rows.map((r: { task_key: string }) => r.task_key);
  } catch {}

  // Derive unique muscle groups
  const seenGroups = new Set<string>();
  const muscleGroupKeys: string[] = [];
  for (const s of sessions) {
    if (!seenGroups.has(s.muscle_group)) {
      seenGroups.add(s.muscle_group);
      muscleGroupKeys.push(s.muscle_group);
    }
  }

  const sessionsByMuscle: Record<string, typeof sessions> = {};
  for (const s of sessions) {
    if (!sessionsByMuscle[s.muscle_group]) sessionsByMuscle[s.muscle_group] = [];
    sessionsByMuscle[s.muscle_group].push(s);
  }

  const sessionsTotal = muscleGroupKeys.length;
  const sessionsCompleted = muscleGroupKeys.filter(
    (k) => (sessionsByMuscle[k] ?? []).some((s) => s.completed)
  ).length;
  const modulesCompleted = Math.min(completedModules.length, MODULES_GOAL);

  const totalTasks = sessionsTotal + MODULES_GOAL;
  const totalCompleted = sessionsCompleted + modulesCompleted;
  const allDone = totalTasks > 0 && totalCompleted >= totalTasks;

  let completionDate = "";
  if (allDone) {
    try {
      const { rows } = await pool.query(
        `SELECT MAX(d) as last_date FROM (
          SELECT MAX(completed_at) as d FROM reboot_completions WHERE client_id = $1::uuid
          UNION ALL
          SELECT MAX(completed_at) as d FROM reboot_task_completions WHERE client_id = $1
        ) dates`,
        [clientId]
      );
      if (rows[0]?.last_date) {
        completionDate = new Intl.DateTimeFormat("fr-FR", {
          day: "numeric", month: "long", year: "numeric",
        }).format(new Date(rows[0].last_date));
      }
    } catch {}
  }

  return (
    <CertificatClient
      firstName={firstName}
      lastName={lastName}
      completionDate={completionDate}
      totalCompleted={totalCompleted}
      totalTasks={totalTasks}
      allDone={allDone}
    />
  );
}

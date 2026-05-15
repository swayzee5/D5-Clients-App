import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/queries/programme";
import { ExecuterClient } from "./ExecuterClient";

export const dynamic = "force-dynamic";

export default async function ExecuterPage({
  params,
}: {
  params: { programId: string; sessionId: string };
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const seance = await getSession(params.sessionId, session.user.id);
  if (!seance || seance.program_id !== params.programId) notFound();
  if (seance.exercises.length === 0) redirect(`/programme/${params.programId}/seance/${params.sessionId}`);

  return (
    <ExecuterClient
      seance={seance}
      clientId={session.user.id}
      programId={params.programId}
    />
  );
}

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { BilanClient } from "./BilanClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bilan séance" };

export default async function BilanPage({
  params,
  searchParams,
}: {
  params: { programId: string; sessionId: string };
  searchParams: { dur?: string; wid?: string };
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const durationSeconds = searchParams.dur ? Number(searchParams.dur) : null;
  const workoutSessionId = searchParams.wid ?? undefined;

  return (
    <BilanClient
      programId={params.programId}
      sessionId={params.sessionId}
      clientId={session.user.id}
      durationSeconds={durationSeconds}
      workoutSessionId={workoutSessionId}
    />
  );
}

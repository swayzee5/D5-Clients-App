import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getProgressEntries } from "@/lib/queries/progression"
import { ProgressionView } from "@/components/progression/ProgressionView"
import { listerPhotos } from "@/lib/queries/progression-photos"
import { Camera, ArrowRight } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Progression",
}

export default async function ProgressionPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const entries = await getProgressEntries(session.user.id)
  const photos = await listerPhotos(session.user.id).catch(() => [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Ma progression</h1>
        <p className="text-d5-muted text-sm mt-1">Poids, mensurations &amp; photos</p>
      </div>

      {/* Avant les courbes : la balance peut stagner six semaines pendant que
          la silhouette change, et c'est le moment où les gens arrêtent. */}
      <Link
        href="/progression/photos"
        className="flex items-center gap-4 rounded-2xl border-2 border-d5-gold/40 bg-d5-gold/5 p-5 transition-transform active:scale-[0.98]"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-d5-gold/15">
          <Camera size={22} className="text-d5-gold" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-white">Mes photos</p>
          <p className="mt-0.5 text-xs leading-relaxed text-d5-muted">
            {photos.length === 0
              ? "Face, dos, profil. Ton point de départ, à prendre une fois."
              : `${photos.length} photo${photos.length > 1 ? "s" : ""} — voir ce qui a changé`}
          </p>
        </div>
        <ArrowRight size={18} className="shrink-0 text-d5-gold" />
      </Link>

      <ProgressionView entries={entries} />
    </div>
  )
}

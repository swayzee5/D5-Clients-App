import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import { User, Mail, LogOut } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Profil",
}

export default async function ProfilPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const name = session.user?.name ?? ""
  const email = session.user?.email ?? ""
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mon profil</h1>
        <p className="text-d5-muted text-sm mt-1">Tes informations personnelles</p>
      </div>

      {/* Avatar + name */}
      <div className="card">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-d5-gold/20 border border-d5-gold/30 flex items-center justify-center flex-shrink-0">
            <span className="text-d5-gold font-black text-lg">{initials}</span>
          </div>
          <div>
            <p className="font-bold text-white text-lg">{name}</p>
            <p className="text-d5-muted text-sm">{email}</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="card space-y-4">
        <div className="flex items-center gap-3">
          <User size={16} className="text-d5-muted" />
          <div>
            <p className="text-xs text-d5-muted">Nom complet</p>
            <p className="text-white text-sm font-medium">{name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Mail size={16} className="text-d5-muted" />
          <div>
            <p className="text-xs text-d5-muted">Email</p>
            <p className="text-white text-sm font-medium">{email}</p>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <form
        action={async () => {
          "use server"
          await signOut({ redirectTo: "/login" })
        }}
      >
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all font-medium"
        >
          <LogOut size={18} />
          Se déconnecter
        </button>
      </form>
    </div>
  )
}

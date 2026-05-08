import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import { User, Mail, LogOut, Lock, Calendar } from "lucide-react"
import Link from "next/link"
import { pool } from "@/lib/db"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Profil" }

export default async function ProfilPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const name = session.user?.name ?? ""
  const email = session.user?.email ?? ""
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)

  let birthDate: string | null = null
  try {
    const { rows } = await pool.query<{ birth_date: string | null }>(
      `SELECT birth_date FROM clients WHERE id = $1`,
      [session.user.id]
    )
    birthDate = rows[0]?.birth_date ?? null
  } catch {
    // ignore
  }

  const age = birthDate
    ? Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mon profil</h1>
        <p className="text-d5-muted text-sm mt-1">Tes informations personnelles</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-d5-gold/20 border border-d5-gold/30 flex items-center justify-center flex-shrink-0">
            <span className="text-d5-gold font-black text-lg">{initials}</span>
          </div>
          <div>
            <p className="font-bold text-white text-lg">{name}</p>
            <p className="text-d5-muted text-sm">{email}</p>
            {age && <p className="text-d5-muted text-xs mt-0.5">{age} ans</p>}
          </div>
        </div>
      </div>

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
        {birthDate && (
          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-d5-muted" />
            <div>
              <p className="text-xs text-d5-muted">Date de naissance</p>
              <p className="text-white text-sm font-medium">
                {new Date(birthDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
        )}
      </div>

      <Link href="/profil/mot-de-passe" className="card flex items-center justify-between hover:border-d5-gold/30 transition-colors group">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-d5-gold/10 flex items-center justify-center">
            <Lock size={16} className="text-d5-gold" />
          </div>
          <div>
            <p className="text-white text-sm font-medium">Changer mon mot de passe</p>
            <p className="text-d5-muted text-xs">Modifie ton mot de passe de connexion</p>
          </div>
        </div>
        <span className="text-d5-muted group-hover:text-white transition-colors">&rsaquo;</span>
      </Link>

      <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
        <button type="submit" className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all font-medium">
          <LogOut size={18} />
          Se déconnecter
        </button>
      </form>
    </div>
  )
}

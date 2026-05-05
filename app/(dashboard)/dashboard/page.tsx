import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Dumbbell, Utensils, Zap, ArrowRight, Calendar } from "lucide-react"
import { WeekCalendar } from "@/components/dashboard/WeekCalendar"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tableau de bord",
}

function getGreeting(name: string): string {
  const hour = new Date().getHours()
  if (hour < 12) return `Bonjour, ${name} !`
  if (hour < 18) return `Bon après-midi, ${name} !`
  return `Bonsoir, ${name} !`
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const firstName = session.user?.name?.split(" ")[0] ?? "Athlète"

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="pt-1">
        <h1 className="text-2xl font-black text-white">{getGreeting(firstName)}</h1>
      </div>

      {/* Weekly calendar */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Mes séances</h2>
          <Link href="/programme" className="text-d5-gold text-sm font-medium">
            Voir tout
          </Link>
        </div>
        <div className="card pt-3 pb-2">
          <WeekCalendar />
          <div className="mt-4 pt-3 border-t border-d5-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-d5-surface-2 flex items-center justify-center flex-shrink-0">
              <Dumbbell size={15} className="text-d5-muted" />
            </div>
            <p className="text-d5-muted text-sm">Aucune séance planifiée</p>
          </div>
        </div>
      </section>

      {/* Programmes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Mes programmes</h2>
          <Link href="/programme" className="text-d5-gold text-sm font-medium">
            Voir tout
          </Link>
        </div>
        <Link href="/programme">
          <div className="card flex items-center gap-3 hover:border-d5-gold/30 transition-colors active:scale-[0.98]">
            <div className="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center flex-shrink-0">
              <Dumbbell size={18} className="text-blue-400" />
            </div>
            <p className="text-d5-muted text-sm flex-1">Pas de programme à afficher</p>
            <ArrowRight size={16} className="text-d5-muted" />
          </div>
        </Link>
      </section>

      {/* Nutrition */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Mes plans de nutrition</h2>
          <Link href="/nutrition" className="text-d5-gold text-sm font-medium">
            Voir tout
          </Link>
        </div>
        <Link href="/nutrition">
          <div className="card flex items-center gap-3 hover:border-d5-gold/30 transition-colors active:scale-[0.98]">
            <div className="w-10 h-10 rounded-xl bg-emerald-400/10 flex items-center justify-center flex-shrink-0">
              <Utensils size={18} className="text-emerald-400" />
            </div>
            <p className="text-d5-muted text-sm flex-1">Pas de plan à afficher</p>
            <ArrowRight size={16} className="text-d5-muted" />
          </div>
        </Link>
      </section>

      {/* Reboot CTA */}
      <Link href="/reboot">
        <div className="bg-gradient-to-br from-d5-gold/20 to-transparent border border-d5-gold/30 rounded-2xl p-5 hover:border-d5-gold/50 transition-all active:scale-[0.98]">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <Zap size={14} className="text-d5-gold" />
                <span className="text-d5-gold text-xs font-bold uppercase tracking-wider">
                  Reboot 40+
                </span>
              </div>
              <h3 className="text-white font-bold">Challenge 7 jours</h3>
              <p className="text-gray-400 text-sm mt-0.5">Démarre ta transformation</p>
            </div>
            <ArrowRight size={20} className="text-d5-gold ml-3 flex-shrink-0" />
          </div>
        </div>
      </Link>
    </div>
  )
}

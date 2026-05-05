import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Dumbbell, Utensils, TrendingUp, Zap, ChevronRight, ArrowRight } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tableau de bord",
}

const quickLinks = [
  {
    href: "/programme",
    icon: Dumbbell,
    label: "Programme",
    description: "Ta séance du jour",
    iconColor: "text-blue-400",
    iconBg: "bg-blue-400/10",
  },
  {
    href: "/nutrition",
    icon: Utensils,
    label: "Nutrition",
    description: "Ton plan alimentaire",
    iconColor: "text-emerald-400",
    iconBg: "bg-emerald-400/10",
  },
  {
    href: "/progression",
    icon: TrendingUp,
    label: "Progression",
    description: "Poids & mensurations",
    iconColor: "text-violet-400",
    iconBg: "bg-violet-400/10",
  },
  {
    href: "/reboot",
    icon: Zap,
    label: "Reboot 40+",
    description: "Challenge 7 jours",
    iconColor: "text-d5-gold",
    iconBg: "bg-d5-gold/10",
  },
]

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const firstName = session.user?.name?.split(" ")[0] ?? "Athlète"

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="pt-1">
        <p className="text-d5-muted text-sm">Bonjour 👋</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">{firstName}</h1>
      </div>

      {/* Quick access grid */}
      <div className="grid grid-cols-2 gap-3">
        {quickLinks.map(({ href, icon: Icon, label, description, iconColor, iconBg }) => (
          <Link key={href} href={href}>
            <div className="bg-d5-surface border border-d5-border rounded-2xl p-4 hover:border-d5-gold/40 transition-all active:scale-95 h-full">
              <div className={`inline-flex p-2.5 rounded-xl ${iconBg} mb-3`}>
                <Icon size={20} className={iconColor} />
              </div>
              <p className="font-semibold text-white text-sm">{label}</p>
              <p className="text-d5-muted text-xs mt-0.5">{description}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Reboot 40+ CTA */}
      <Link href="/reboot">
        <div className="bg-gradient-to-br from-d5-gold/20 to-transparent border border-d5-gold/30 rounded-2xl p-5 hover:border-d5-gold/50 transition-all active:scale-[0.98]">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <Zap size={14} className="text-d5-gold" />
                <span className="text-d5-gold text-xs font-semibold uppercase tracking-wider">
                  Reboot 40+
                </span>
              </div>
              <h3 className="text-white font-bold text-base">Challenge 7 jours</h3>
              <p className="text-gray-400 text-sm mt-0.5">
                Démarre ta transformation aujourd&apos;hui
              </p>
            </div>
            <ArrowRight size={20} className="text-d5-gold ml-3 flex-shrink-0" />
          </div>
        </div>
      </Link>
    </div>
  )
}

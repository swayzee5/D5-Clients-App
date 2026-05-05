"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Dumbbell, TrendingUp, User, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

const leftNav = [
  { href: "/dashboard", icon: Home, label: "Accueil" },
  { href: "/programme", icon: Dumbbell, label: "Programme" },
]

const rightNav = [
  { href: "/progression", icon: TrendingUp, label: "Progrès" },
  { href: "/profil", icon: User, label: "Profil" },
]

export function BottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href))

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-d5-surface/95 backdrop-blur-md border-t border-d5-border z-50">
      <div className="flex items-end max-w-lg mx-auto px-2 pb-safe">
        {/* Left */}
        <div className="flex flex-1 justify-around py-2">
          {leftNav.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all",
                isActive(href) ? "text-d5-gold" : "text-d5-muted"
              )}
            >
              <Icon size={21} strokeWidth={isActive(href) ? 2.5 : 1.75} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
        </div>

        {/* Center FAB */}
        <div className="flex flex-col items-center px-3 -mb-1">
          <Link
            href="/progression/nouvelle-entree"
            className="w-14 h-14 rounded-2xl bg-d5-gold flex items-center justify-center shadow-lg shadow-d5-gold/25 active:scale-90 transition-all hover:bg-d5-gold-light"
            aria-label="Nouvelle mesure"
          >
            <Plus size={28} className="text-black" strokeWidth={2.5} />
          </Link>
          <span className="text-[9px] text-d5-muted mt-1.5 mb-1">Ajouter</span>
        </div>

        {/* Right */}
        <div className="flex flex-1 justify-around py-2">
          {rightNav.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all",
                isActive(href) ? "text-d5-gold" : "text-d5-muted"
              )}
            >
              <Icon size={21} strokeWidth={isActive(href) ? 2.5 : 1.75} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}

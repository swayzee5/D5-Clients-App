"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, TrendingUp, User, Plus, X, Activity, CalendarPlus, Ruler, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

export function BottomNav({ unreadMessages = 0 }: { unreadMessages?: number }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href))

  const leftNav = [
    { href: "/dashboard", icon: Home, label: "Accueil" },
    { href: "/progression", icon: TrendingUp, label: "Progrès" },
  ]

  const rightNav = [
    { href: "/messagerie", icon: MessageCircle, label: "Messagerie", badge: unreadMessages },
    { href: "/profil", icon: User, label: "Profil", badge: 0 },
  ]

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute bottom-24 left-4 right-4 max-w-lg mx-auto bg-d5-surface border border-d5-border rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Link href="/activites" onClick={() => setOpen(false)}
              className="flex items-center gap-4 px-5 py-4 border-b border-d5-border hover:bg-d5-surface-2 transition-colors active:bg-d5-surface-2">
              <div className="w-10 h-10 rounded-xl bg-d5-gold/10 flex items-center justify-center flex-shrink-0">
                <Activity size={18} className="text-d5-gold" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Mes activités</p>
                <p className="text-d5-muted text-xs">Historique de toutes vos séances</p>
              </div>
            </Link>
            <Link href="/activite/nouvelle" onClick={() => setOpen(false)}
              className="flex items-center gap-4 px-5 py-4 border-b border-d5-border hover:bg-d5-surface-2 transition-colors active:bg-d5-surface-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-400/10 flex items-center justify-center flex-shrink-0">
                <CalendarPlus size={18} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Aujourd&apos;hui</p>
                <p className="text-d5-muted text-xs">Logger une activité libre</p>
              </div>
            </Link>
            <Link href="/progression/nouvelle-entree" onClick={() => setOpen(false)}
              className="flex items-center gap-4 px-5 py-4 hover:bg-d5-surface-2 transition-colors active:bg-d5-surface-2">
              <div className="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center flex-shrink-0">
                <Ruler size={18} className="text-blue-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Nouvelle mesure</p>
                <p className="text-d5-muted text-xs">Poids &amp; mensurations</p>
              </div>
            </Link>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-d5-surface/95 backdrop-blur-md border-t border-d5-border z-50">
        <div className="flex items-end max-w-lg mx-auto px-2 pb-safe">
          {/* Left */}
          <div className="flex flex-1 justify-around py-2">
            {leftNav.map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href}
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
            <button
              onClick={() => setOpen((o) => !o)}
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-90",
                open
                  ? "bg-d5-surface-2 shadow-none border border-d5-border"
                  : "bg-d5-gold shadow-d5-gold/25 hover:bg-d5-gold-light"
              )}
              aria-label="Ajouter"
            >
              {open ? <X size={26} className="text-white" strokeWidth={2.5} />
                    : <Plus size={28} className="text-black" strokeWidth={2.5} />}
            </button>
            <span className="text-[9px] text-d5-muted mt-1.5 mb-1">Ajouter</span>
          </div>

          {/* Right */}
          <div className="flex flex-1 justify-around py-2">
            {rightNav.map(({ href, icon: Icon, label, badge }) => (
              <Link key={href} href={href}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all relative",
                  isActive(href) ? "text-d5-gold" : "text-d5-muted"
                )}
              >
                <div className="relative">
                  <Icon size={21} strokeWidth={isActive(href) ? 2.5 : 1.75} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </>
  )
}

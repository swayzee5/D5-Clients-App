"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, Dumbbell, TrendingUp, User, Plus, X, Ruler } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"

const leftNav = [
  { href: "/dashboard", icon: Home, label: "Accueil" },
  { href: "/programme", icon: Dumbbell, label: "Programme" },
]

const rightNav = [
  { href: "/progression", icon: TrendingUp, label: "Progrès" },
  { href: "/profil", icon: User, label: "Profil" },
]

const menuItems = [
  {
    href: "/programme",
    icon: Dumbbell,
    label: "Séance",
    description: "Commencer mon entraînement",
    color: "bg-orange-500/10",
    iconColor: "text-orange-400",
  },
  {
    href: "/progression/nouvelle-entree",
    icon: Ruler,
    label: "Données",
    description: "Enregistrer mes mesures",
    color: "bg-blue-500/10",
    iconColor: "text-blue-400",
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href))

  const handleAction = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Menu sheet */}
      {open && (
        <div className="fixed bottom-[76px] left-0 right-0 z-60 px-4 pb-2">
          <div className="bg-[#1c1c1e] rounded-2xl border border-white/10 overflow-hidden max-w-lg mx-auto">
            {menuItems.map((item, i) => (
              <button
                key={item.href}
                onClick={() => handleAction(item.href)}
                className={cn(
                  "w-full flex items-center gap-4 px-5 py-4 text-left active:bg-white/5 transition-colors",
                  i < menuItems.length - 1 && "border-b border-white/8"
                )}
              >
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", item.color)}>
                  <item.icon size={20} className={item.iconColor} />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setOpen(false)}
            className="w-full mt-3 py-4 bg-[#1c1c1e] rounded-2xl border border-white/10 text-sm font-semibold text-white max-w-lg mx-auto block active:opacity-70 transition-opacity"
          >
            Annuler
          </button>
        </div>
      )}

      {/* Nav bar */}
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
            <button
              onClick={() => setOpen(!open)}
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all",
                open
                  ? "bg-gray-600 shadow-gray-500/25"
                  : "bg-d5-gold shadow-d5-gold/25 hover:bg-d5-gold-light"
              )}
              aria-label="Ajouter"
            >
              {open
                ? <X size={24} className="text-white" strokeWidth={2.5} />
                : <Plus size={28} className="text-black" strokeWidth={2.5} />
              }
            </button>
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
    </>
  )
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Dumbbell, Utensils, TrendingUp, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", icon: Home, label: "Accueil" },
  { href: "/programme", icon: Dumbbell, label: "Programme" },
  { href: "/nutrition", icon: Utensils, label: "Nutrition" },
  { href: "/progression", icon: TrendingUp, label: "Progrès" },
  { href: "/profil", icon: User, label: "Profil" },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-d5-surface/95 backdrop-blur-md border-t border-d5-border z-50">
      <div className="flex items-center justify-around max-w-lg mx-auto px-1 py-2 pb-safe">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href))

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all min-w-0",
                isActive
                  ? "text-d5-gold"
                  : "text-d5-muted hover:text-gray-300 active:scale-90"
              )}
            >
              <Icon size={21} strokeWidth={isActive ? 2.5 : 1.75} />
              <span
                className={cn(
                  "text-[10px] font-medium truncate",
                  isActive ? "text-d5-gold" : "text-d5-muted"
                )}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

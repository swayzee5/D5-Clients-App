interface HeaderProps {
  userName?: string | null
}

export function Header({ userName }: HeaderProps) {
  const firstName = userName?.split(" ")[0]

  return (
    <header className="sticky top-0 z-40 bg-d5-bg/95 backdrop-blur-sm border-b border-d5-border">
      <div className="flex items-center justify-between max-w-lg mx-auto px-4 h-14">
        <div className="flex items-center gap-2">
          <span className="text-d5-gold font-black text-xl tracking-tighter">D5</span>
          <span className="text-white/30 text-sm">|</span>
          <span className="text-white/60 text-sm font-medium">Coaching</span>
        </div>
        {firstName && (
          <span className="text-d5-muted text-sm">{firstName}</span>
        )}
      </div>
    </header>
  )
}

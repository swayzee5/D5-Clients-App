import type { Metadata } from "next"
import { LoginForm } from "@/components/auth/LoginForm"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Connexion",
}

export default function LoginPage() {
  return (
    <div className="min-h-dvh bg-d5-bg flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="https://raw.githubusercontent.com/swayzee5/D5-Clients-App/main/Logo%20D5.PNG"
            alt="D5 Coaching"
            width={120}
            height={80}
            className="object-contain"
            priority
          />
        </div>

        {/* Coach */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-d5-gold/40">
            <Image
              src="https://raw.githubusercontent.com/swayzee5/D5-Clients-App/main/image00001.png"
              alt="Daye Kaba - Coach D5"
              fill
              className="object-cover object-top"
            />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold text-sm">Daye Kaba</p>
            <p className="text-d5-muted text-xs">Ton coach D5</p>
          </div>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}

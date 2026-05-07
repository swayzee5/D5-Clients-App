import type { Metadata } from "next"
import { LoginForm } from "@/components/auth/LoginForm"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Connexion",
}

export default function LoginPage() {
  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center px-5 py-12 overflow-hidden">
      {/* Photo de fond */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://raw.githubusercontent.com/swayzee5/D5-Clients-App/main/image00002.png"
          alt=""
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-black/75" />
      </div>

      {/* Contenu */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-d5-surface border border-d5-border mb-5 overflow-hidden">
            <Image
              src="https://raw.githubusercontent.com/swayzee5/D5-Clients-App/main/Logo%20D5.PNG"
              alt="D5 Coaching"
              width={64}
              height={64}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-white">D5 Coaching</h1>
          <p className="text-d5-muted mt-1.5 text-sm">Ton espace personnel</p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
